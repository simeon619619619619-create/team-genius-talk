import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganizations } from "./useOrganizations";

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
  const fetchingRef = useRef(false);
  const lastOrgIdRef = useRef<string | null>(null);

  const fetchOrCreateProject = useCallback(async () => {
    if (!user) {
      setProject(null);
      setLoading(false);
      return;
    }

    // Wait for orgs to load
    if (orgsLoading) return;

    // Prevent duplicate fetches for same org
    const currentOrgId = currentOrganization?.id || null;
    if (fetchingRef.current && lastOrgIdRef.current === currentOrgId) return;
    
    fetchingRef.current = true;
    lastOrgIdRef.current = currentOrgId;

    try {
      // If we have a current organization, get the project for that organization
      if (currentOrganization) {
        // Try to find existing project for this organization (owned by user OR accessible via user_roles)
        const { data: existingProject, error: fetchError } = await supabase
          .from("projects")
          .select("*")
          .eq("organization_id", currentOrganization.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        if (existingProject) {
          setProject(existingProject);
        } else if (currentOrganization.owner_id === user.id) {
          // Only the organization owner creates new projects
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
        } else {
          // Member without a project in this org
          setProject(null);
        }
      } else {
        // No organization selected - check for unassigned projects owned by user
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
          // No owned project - check for projects accessible via user_roles (team members)
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("project_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (roleData?.project_id) {
            const { data: accessibleProject } = await supabase
              .from("projects")
              .select("*")
              .eq("id", roleData.project_id)
              .maybeSingle();

            if (accessibleProject) {
              setProject(accessibleProject);
            } else {
              setProject(null);
            }
          } else {
            setProject(null);
          }
        }
      }

      // Check if there are unassigned projects OR orphaned tasks that need migration
      const [projectsResult, tasksResult] = await Promise.all([
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .is("organization_id", null),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("project_id", null)
      ]);

      const unassignedProjectsCount = projectsResult.count || 0;
      const orphanedTasksCount = tasksResult.count || 0;

      if (unassignedProjectsCount > 0 || orphanedTasksCount > 0) {
        setNeedsMigration(true);
        setUnassignedCount(unassignedProjectsCount + orphanedTasksCount);
      } else {
        setNeedsMigration(false);
        setUnassignedCount(0);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      // Don't show toast for network errors to avoid spam
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, currentOrganization?.id, orgsLoading]);

  useEffect(() => {
    fetchOrCreateProject();
  }, [fetchOrCreateProject]);

  const refetch = useCallback(() => {
    fetchingRef.current = false;
    lastOrgIdRef.current = null;
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
