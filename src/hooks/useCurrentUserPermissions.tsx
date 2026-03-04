import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCurrentProject } from "./useCurrentProject";

interface UserPermissions {
  canViewTasks: boolean;
  canViewBusinessPlan: boolean;
  canViewAnnualPlan: boolean;
  canViewAll: boolean;
  isOwner: boolean;
  isTeamMember: boolean;
}

export function useCurrentUserPermissions() {
  const { user } = useAuth();
  const { project: currentProject } = useCurrentProject();
  const [permissions, setPermissions] = useState<UserPermissions>({
    canViewTasks: false,
    canViewBusinessPlan: false,
    canViewAnnualPlan: false,
    canViewAll: false,
    isOwner: false,
    isTeamMember: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || !currentProject) {
        setPermissions({
          canViewTasks: false,
          canViewBusinessPlan: false,
          canViewAnnualPlan: false,
          canViewAll: false,
          isOwner: false,
          isTeamMember: false,
        });
        setLoading(false);
        return;
      }

      try {
        // Check if user is project owner
        const isOwner = currentProject.owner_id === user.id;

        if (isOwner) {
          // Owners have full access
          setPermissions({
            canViewTasks: true,
            canViewBusinessPlan: true,
            canViewAnnualPlan: true,
            canViewAll: true,
            isOwner: true,
            isTeamMember: false,
          });
          setLoading(false);
          return;
        }

        // Check user_roles for editor/admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("project_id", currentProject.id)
          .maybeSingle();

        if (roleData && ["owner", "editor", "admin"].includes(roleData.role)) {
          setPermissions({
            canViewTasks: true,
            canViewBusinessPlan: true,
            canViewAnnualPlan: true,
            canViewAll: true,
            isOwner: false,
            isTeamMember: false,
          });
          setLoading(false);
          return;
        }

        // Check team member permissions
        const { data: teamMemberData } = await supabase
          .from("team_members")
          .select(`
            id,
            status,
            teams!inner(project_id),
            member_permissions(
              can_view_tasks,
              can_view_business_plan,
              can_view_annual_plan,
              can_view_all
            )
          `)
          .eq("user_id", user.id)
          .eq("teams.project_id", currentProject.id)
          .eq("status", "accepted")
          .maybeSingle();

        if (teamMemberData) {
          const perms = teamMemberData.member_permissions?.[0];
          setPermissions({
            canViewTasks: perms?.can_view_all || perms?.can_view_tasks || false,
            canViewBusinessPlan: perms?.can_view_all || perms?.can_view_business_plan || false,
            canViewAnnualPlan: perms?.can_view_all || perms?.can_view_annual_plan || false,
            canViewAll: perms?.can_view_all || false,
            isOwner: false,
            isTeamMember: true,
          });
        } else {
          // Viewer role without team membership - basic access
          setPermissions({
            canViewTasks: false,
            canViewBusinessPlan: false,
            canViewAnnualPlan: false,
            canViewAll: false,
            isOwner: false,
            isTeamMember: false,
          });
        }
      } catch (error) {
        console.error("Error fetching user permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, currentProject]);

  return { permissions, loading };
}
