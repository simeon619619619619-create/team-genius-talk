import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface DbTeam {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTeamMember {
  id: string;
  team_id: string;
  user_id: string | null;
  email: string;
  role: string;
  status: string;
  
  invited_at: string;
  accepted_at: string | null;
  invited_by: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface TeamWithMembers extends DbTeam {
  members: DbTeamMember[];
}

export function useTeams(projectId: string | null) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (!projectId || !user) {
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch teams for the project
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("project_id", projectId);

      if (teamsError) throw teamsError;

      // Fetch members for all teams
      const teamsWithMembers: TeamWithMembers[] = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: membersData, error: membersError } = await supabase
            .from("team_members")
            .select("*")
            .eq("team_id", team.id);

          if (membersError) {
            return { ...team, members: [] };
          }

          // Fetch profiles for accepted members
          const membersWithProfiles = await Promise.all(
            (membersData || []).map(async (member) => {
              if (member.user_id) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name, email, avatar_url")
                  .eq("user_id", member.user_id)
                  .single();
                
                return { ...member, profile: profile || undefined };
              }
              return member;
            })
          );

          return { ...team, members: membersWithProfiles };
        })
      );

      setTeams(teamsWithMembers);
    } catch (error) {
      toast.error("Грешка при зареждане на екипите");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [projectId, user]);

  const createTeam = async (name: string, description: string) => {
    if (!projectId || !user) return null;

    try {
      const { data, error } = await supabase
        .from("teams")
        .insert({
          project_id: projectId,
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add the team with empty members
      setTeams([...teams, { ...data, members: [] }]);
      toast.success("Екипът е създаден успешно!");
      return data;
    } catch (error: any) {
      toast.error("Грешка при създаване на екипа");
      return null;
    }
  };

  const updateTeam = async (teamId: string, name: string, description: string) => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .update({ name, description })
        .eq("id", teamId)
        .select()
        .single();

      if (error) throw error;

      setTeams(teams.map((t) => 
        t.id === teamId ? { ...t, name: data.name, description: data.description } : t
      ));
      toast.success("Екипът е обновен успешно!");
      return data;
    } catch (error: any) {
      toast.error("Грешка при обновяване на екипа");
      return null;
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;

      setTeams(teams.filter((t) => t.id !== teamId));
      toast.success("Екипът е изтрит успешно!");
    } catch (error: any) {
      toast.error("Грешка при изтриване на екипа");
    }
  };

  const inviteMember = async (teamId: string, email: string, name: string, role: string): Promise<{ invitationUrl?: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("create-invitation-link", {
        body: { teamId, email, name, role },
      });

      if (error) throw error;

      await fetchTeams(); // Refresh teams
      return data;
    } catch (error: any) {
      toast.error(`Грешка при създаване на поканата: ${error.message}`);
      return null;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Update local state
      setTeams(teams.map((team) => ({
        ...team,
        members: team.members.filter((m) => m.id !== memberId),
      })));
      
      toast.success("Членът е премахнат от екипа!");
    } catch (error: any) {
      toast.error("Грешка при премахване на члена");
    }
  };

  return {
    teams,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteMember,
    removeMember,
    refreshTeams: fetchTeams,
  };
}
