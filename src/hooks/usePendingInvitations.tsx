import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PendingInvitation {
  id: string;
  token: string;
  expires_at: string;
  team_member_id: string;
  team_member: {
    id: string;
    email: string;
    role: string;
    team_id: string;
  };
  team: {
    id: string;
    name: string;
    project_id: string;
  };
  project: {
    id: string;
    name: string;
    organization_id: string | null;
  };
  organization: {
    id: string;
    name: string;
  } | null;
  permissions: {
    can_view_tasks: boolean;
    can_view_business_plan: boolean;
    can_view_annual_plan: boolean;
    can_view_all: boolean;
  } | null;
}

export function usePendingInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    if (!user?.email) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    try {
      // Find team_members with status pending that match user's email
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("id, email, role, team_id")
        .eq("email", user.email.toLowerCase())
        .eq("status", "pending");

      if (membersError) throw membersError;

      if (!teamMembers || teamMembers.length === 0) {
        setInvitations([]);
        setLoading(false);
        return;
      }

      // Get valid invitations for these team members
      const memberIds = teamMembers.map((m) => m.id);
      const { data: invitationsData, error: invError } = await supabase
        .from("team_invitations")
        .select("*")
        .in("team_member_id", memberIds)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString());

      if (invError) throw invError;

      if (!invitationsData || invitationsData.length === 0) {
        setInvitations([]);
        setLoading(false);
        return;
      }

      // Enrich each invitation with team, project, org data
      const enrichedInvitations: PendingInvitation[] = [];

      for (const inv of invitationsData) {
        const teamMember = teamMembers.find((m) => m.id === inv.team_member_id);
        if (!teamMember) continue;

        // Get team
        const { data: team } = await supabase
          .from("teams")
          .select("id, name, project_id")
          .eq("id", teamMember.team_id)
          .single();

        if (!team) continue;

        // Get project
        const { data: project } = await supabase
          .from("projects")
          .select("id, name, organization_id")
          .eq("id", team.project_id)
          .single();

        if (!project) continue;

        // Get organization if exists
        let organization = null;
        if (project.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("id", project.organization_id)
            .single();
          organization = org;
        }

        // Get permissions if they exist
        const { data: perms } = await supabase
          .from("member_permissions")
          .select("can_view_tasks, can_view_business_plan, can_view_annual_plan, can_view_all")
          .eq("team_member_id", teamMember.id)
          .maybeSingle();

        enrichedInvitations.push({
          id: inv.id,
          token: inv.token,
          expires_at: inv.expires_at,
          team_member_id: inv.team_member_id,
          team_member: teamMember,
          team: team,
          project: project,
          organization: organization,
          permissions: perms,
        });
      }

      setInvitations(enrichedInvitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    loading,
    refetch: fetchInvitations,
  };
}
