import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizations } from "./useOrganizations";
import { toast } from "sonner";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCurrentProject() {
  const { user } = useAuth();
  const { currentOrganization, loading: orgsLoading } = useOrganizations();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);

  const fetchOrCreateProject = useCallback(async () => {
    if (!user) {
      setProject(null);
      setLoading(false);
      return;
    }

    // Wait for orgs to load
    if (orgsLoading) return;

    try {
      // If we have a current organization, get the project for that organization
      if (currentOrganization) {
        // Try to find existing project for this organization
        const { data: existingProject, error: fetchError } = await supabase
          .from("projects")
          .select("*")
          .eq("organization_id", currentOrganization.id)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        if (existingProject) {
          setProject(existingProject);
        } else {
          // Create a new project for this organization
          const { data: newProject, error: createError } = await supabase
            .from("projects")
            .insert({
              name: `Проект на ${currentOrganization.name}`,
              owner_id: user.id,
              organization_id: currentOrganization.id,
              description: "Основен проект",
            })
            .select()
            .single();

          if (createError) throw createError;
          setProject(newProject);
        }
      } else {
        // No organization selected - check for unassigned projects
        const { data: unassigned, error: unassignedError } = await supabase
          .from("projects")
          .select("*")
          .eq("owner_id", user.id)
          .is("organization_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (unassignedError && unassignedError.code !== "PGRST116") {
          throw unassignedError;
        }

        if (unassigned) {
          setProject(unassigned);
        } else {
          setProject(null);
        }
      }

      // Check if there are unassigned projects that need migration
      const { count, error: countError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .is("organization_id", null);

      if (!countError && count && count > 0) {
        setNeedsMigration(true);
        setUnassignedCount(count);
      } else {
        setNeedsMigration(false);
        setUnassignedCount(0);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Грешка при зареждане на проекта");
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization, orgsLoading]);

  useEffect(() => {
    fetchOrCreateProject();
  }, [fetchOrCreateProject]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchOrCreateProject();
  }, [fetchOrCreateProject]);

  return {
    project,
    projectId: project?.id || null,
    projectName: project?.name || "",
    loading: loading || orgsLoading,
    needsMigration,
    unassignedCount,
    refetch,
  };
}
