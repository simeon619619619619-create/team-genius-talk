import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { toast } from "sonner";
import type { WorkflowExecution, WorkflowEvent } from "@/types/workflow";

export function useWorkflowExecution(workflowId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: executions = [], isLoading: executionsLoading } = useQuery({
    queryKey: ["workflow_executions", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", workflowId!)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as WorkflowExecution[];
    },
    enabled: !!workflowId && !!user,
  });

  const activeExecution = executions.find(e => e.status === "running") || executions[0];

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["workflow_events", activeExecution?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_events")
        .select("*")
        .eq("execution_id", activeExecution!.id)
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data as WorkflowEvent[];
    },
    enabled: !!activeExecution,
  });

  // Realtime subscription for live event updates
  useEffect(() => {
    if (!activeExecution || activeExecution.status !== "running") return;

    const channel = supabase
      .channel(`execution-${activeExecution.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_events",
          filter: `execution_id=eq.${activeExecution.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["workflow_events", activeExecution.id] });
          queryClient.invalidateQueries({ queryKey: ["workflow_executions", workflowId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeExecution?.id, activeExecution?.status, workflowId, queryClient]);

  const startExecution = useMutation({
    mutationFn: async (inputData?: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("workflow-execute", {
        body: { workflow_id: workflowId, input_data: inputData || {} },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_executions", workflowId] });
      toast.success("Workflow стартиран!");
    },
    onError: (err) => toast.error(`Грешка: ${err.message}`),
  });

  const cancelExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from("workflow_executions")
        .update({ status: "cancelled", finished_at: new Date().toISOString() })
        .eq("id", executionId);
      if (error) throw error;
      await supabase
        .from("workflow_events")
        .update({ status: "skipped" })
        .eq("execution_id", executionId)
        .eq("status", "pending");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_executions", workflowId] });
      toast.success("Workflow спрян");
    },
  });

  const retryFromEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.functions.invoke("workflow-execute", {
        body: { workflow_id: workflowId, retry_from_event_id: eventId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow_executions", workflowId] });
      toast.success("Retry стартиран!");
    },
  });

  return {
    executions,
    events,
    activeExecution,
    executionsLoading,
    eventsLoading,
    startExecution,
    cancelExecution,
    retryFromEvent,
  };
}
