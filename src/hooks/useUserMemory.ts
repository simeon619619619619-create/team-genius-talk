import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { UserMemory } from "@/types/workflow";

export function useUserMemory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: memory, isLoading } = useQuery({
    queryKey: ["user_memory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_memory")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserMemory | null;
    },
    enabled: !!user,
  });

  const updateMemorySection = useMutation({
    mutationFn: async (params: {
      section: keyof Pick<UserMemory, 'methodology_data' | 'marketing_plan' | 'business_plan' | 'api_connections' | 'team_config' | 'processes' | 'automation_patterns'>;
      data: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("user_memory")
        .upsert({
          user_id: user!.id,
          [params.section]: params.data,
        }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_memory"] });
    },
  });

  return { memory, isLoading, updateMemorySection };
}
