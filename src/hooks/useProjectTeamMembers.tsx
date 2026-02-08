import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProject } from "@/hooks/useCurrentProject";

export interface ProjectTeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export function useProjectTeamMembers() {
  const { projectId } = useCurrentProject();
  const [members, setMembers] = useState<ProjectTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!projectId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        // Get team members for this project
        const { data: teamMembers, error } = await supabase
          .from("team_members")
          .select(`
            id,
            email,
            role,
            user_id,
            teams!inner(project_id)
          `)
          .eq("teams.project_id", projectId)
          .eq("status", "accepted");

        if (error) throw error;

        // Get profiles for these users to get full names
        const userIds = (teamMembers || [])
          .map(m => m.user_id)
          .filter(Boolean) as string[];

        let profilesMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);

          if (profiles) {
            profilesMap = Object.fromEntries(
              profiles.map(p => [p.user_id, p.full_name || ""])
            );
          }
        }

        // Also get the project owner
        const { data: project } = await supabase
          .from("projects")
          .select("owner_id")
          .eq("id", projectId)
          .single();

        const allMembers: ProjectTeamMember[] = [];

        // Add owner
        if (project?.owner_id) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .eq("user_id", project.owner_id)
            .single();

          if (ownerProfile) {
            allMembers.push({
              id: ownerProfile.user_id,
              email: ownerProfile.email || "",
              full_name: ownerProfile.full_name,
              role: "owner",
            });
          }
        }

        // Add team members (avoid duplicating owner)
        for (const tm of teamMembers || []) {
          if (tm.user_id && tm.user_id === project?.owner_id) continue;
          allMembers.push({
            id: tm.id,
            email: tm.email,
            full_name: tm.user_id ? profilesMap[tm.user_id] || null : null,
            role: tm.role,
          });
        }

        setMembers(allMembers);
      } catch (error) {
        console.error("Error fetching project team members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [projectId]);

  return { members, loading };
}
