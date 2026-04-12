import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Workflow, WorkflowStatus, WorkflowTriggerType, MindMapData } from "@/types/workflow";

export function useWorkflows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Workflow[];
    },
    enabled: !!user,
  });

  const createWorkflow = useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      trigger_type?: WorkflowTriggerType;
      mind_map_json?: MindMapData;
    }) => {
      const { data, error } = await supabase
        .from("workflows")
        .insert({
          owner_id: user!.id,
          name: params.name,
          description: params.description || "",
          trigger_type: params.trigger_type || "manual",
          mind_map_json: params.mind_map_json || { nodes: [], edges: [] },
        })
        .select()
        .single();
      if (error) throw error;
      return data as Workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow създаден!");
    },
    onError: () => toast.error("Грешка при създаване"),
  });

  const updateWorkflow = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      description?: string;
      status?: WorkflowStatus;
      trigger_type?: WorkflowTriggerType;
      trigger_config?: Record<string, unknown>;
      mind_map_json?: MindMapData;
    }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("workflows")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow изтрит");
    },
    onError: () => toast.error("Грешка при изтриване"),
  });

  return { workflows, isLoading, createWorkflow, updateWorkflow, deleteWorkflow };
}
