import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MemberPermissions } from "@/components/teams/MemberPermissionsEditor";

export function useMemberPermissions() {
  const [loading, setLoading] = useState(false);

  const savePermissions = useCallback(
    async (teamMemberId: string, permissions: MemberPermissions) => {
      setLoading(true);
      try {
        // Upsert permissions
        const { error } = await supabase
          .from("member_permissions")
          .upsert(
            {
              team_member_id: teamMemberId,
              can_view_tasks: permissions.can_view_tasks,
              can_view_business_plan: permissions.can_view_business_plan,
              can_view_annual_plan: permissions.can_view_annual_plan,
              can_view_all: permissions.can_view_all,
            },
            { onConflict: "team_member_id" }
          );

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("Error saving permissions:", error);
        toast.error("Грешка при запазване на правата");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getPermissions = useCallback(async (teamMemberId: string) => {
    try {
      const { data, error } = await supabase
        .from("member_permissions")
        .select("*")
        .eq("team_member_id", teamMemberId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          can_view_tasks: data.can_view_tasks,
          can_view_business_plan: data.can_view_business_plan,
          can_view_annual_plan: data.can_view_annual_plan,
          can_view_all: data.can_view_all,
        } as MemberPermissions;
      }

      return null;
    } catch (error) {
      console.error("Error fetching permissions:", error);
      return null;
    }
  }, []);

  return {
    loading,
    savePermissions,
    getPermissions,
  };
}
