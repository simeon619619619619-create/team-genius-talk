import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Agent {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  task_prompt: string;
  schedule_cron: string;
  timezone: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  owner_id: string;
  status: "running" | "success" | "error" | "cancelled";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  output_summary: string | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface AgentWithLastRun extends Agent {
  last_run: AgentRun | null;
}

export type AgentInput = Pick<
  Agent,
  "name" | "description" | "task_prompt" | "schedule_cron" | "timezone" | "is_active"
>;

export function useAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentWithLastRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!user) {
      setAgents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: agentsData, error: agentsError } = await (supabase as any)
      .from("agents")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (agentsError) {
      toast.error("Грешка при зареждане на агенти: " + agentsError.message);
      setLoading(false);
      return;
    }

    const agentList: Agent[] = (agentsData as Agent[]) ?? [];
    if (agentList.length === 0) {
      setAgents([]);
      setLoading(false);
      return;
    }

    // Fetch latest run per agent (one query, then group client-side)
    const agentIds = agentList.map((a) => a.id);
    const { data: runsData } = await (supabase as any)
      .from("agent_runs")
      .select("*")
      .in("agent_id", agentIds)
      .order("started_at", { ascending: false });

    const runs: AgentRun[] = (runsData as AgentRun[]) ?? [];
    const lastRunByAgent = new Map<string, AgentRun>();
    for (const r of runs) {
      if (!lastRunByAgent.has(r.agent_id)) lastRunByAgent.set(r.agent_id, r);
    }

    setAgents(
      agentList.map((a) => ({ ...a, last_run: lastRunByAgent.get(a.id) ?? null }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgent = useCallback(
    async (input: AgentInput) => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("agents")
        .insert({ ...input, owner_id: user.id })
        .select()
        .single();
      if (error) {
        toast.error("Грешка при създаване: " + error.message);
        return null;
      }
      toast.success("Агентът е създаден");
      await fetchAgents();
      return data as Agent;
    },
    [user, fetchAgents]
  );

  const updateAgent = useCallback(
    async (id: string, patch: Partial<AgentInput>) => {
      const { error } = await (supabase as any)
        .from("agents")
        .update(patch)
        .eq("id", id);
      if (error) {
        toast.error("Грешка при обновяване: " + error.message);
        return false;
      }
      toast.success("Агентът е обновен");
      await fetchAgents();
      return true;
    },
    [fetchAgents]
  );

  const deleteAgent = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from("agents").delete().eq("id", id);
      if (error) {
        toast.error("Грешка при изтриване: " + error.message);
        return false;
      }
      toast.success("Агентът е изтрит");
      await fetchAgents();
      return true;
    },
    [fetchAgents]
  );

  const logManualRun = useCallback(
    async (agentId: string, status: AgentRun["status"], summary?: string, error?: string) => {
      if (!user) return;
      const startedAt = new Date().toISOString();
      await (supabase as any).from("agent_runs").insert({
        agent_id: agentId,
        owner_id: user.id,
        status,
        started_at: startedAt,
        finished_at: startedAt,
        duration_ms: 0,
        output_summary: summary ?? null,
        error_message: error ?? null,
        triggered_by: "manual",
      });
      await (supabase as any)
        .from("agents")
        .update({ last_run_at: startedAt })
        .eq("id", agentId);
      await fetchAgents();
    },
    [user, fetchAgents]
  );

  const fetchRunsForAgent = useCallback(
    async (agentId: string, limit = 30): Promise<AgentRun[]> => {
      const { data } = await (supabase as any)
        .from("agent_runs")
        .select("*")
        .eq("agent_id", agentId)
        .order("started_at", { ascending: false })
        .limit(limit);
      return ((data as AgentRun[]) ?? []) as AgentRun[];
    },
    []
  );

  return {
    agents,
    loading,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    logManualRun,
    fetchRunsForAgent,
  };
}
