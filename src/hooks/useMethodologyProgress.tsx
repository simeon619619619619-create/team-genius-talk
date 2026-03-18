import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const ALL_MODULE_KEYS = ["vision", "research", "offer", "copy", "traffic"];

export function useMethodologyProgress() {
  const { user } = useAuth();
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [methodologyCompleted, setMethodologyCompleted] = useState(false);
  const [planCompleted, setPlanCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const [{ data: completions }, { data: profile }] = await Promise.all([
      supabase
        .from("module_completions")
        .select("module_key")
        .eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("methodology_completed, plan_completed")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const keys = new Set((completions || []).map((c: any) => c.module_key));
    setCompletedModules(keys);
    setMethodologyCompleted(profile?.methodology_completed || false);
    setPlanCompleted((profile as any)?.plan_completed || false);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  // Mark a module as complete, optionally with a chat summary
  const completeModule = useCallback(async (moduleKey: string, chatSummary?: string) => {
    if (!user) return;

    await supabase
      .from("module_completions")
      .upsert(
        { user_id: user.id, module_key: moduleKey, chat_summary: chatSummary || null, completed_at: new Date().toISOString() },
        { onConflict: "user_id,module_key" }
      );

    const newCompleted = new Set(completedModules);
    newCompleted.add(moduleKey);
    setCompletedModules(newCompleted);

    // Check if all modules are done
    const allDone = ALL_MODULE_KEYS.every(k => newCompleted.has(k));
    if (allDone && !methodologyCompleted) {
      await supabase
        .from("profiles")
        .update({ methodology_completed: true })
        .eq("user_id", user.id);
      setMethodologyCompleted(true);
    }
  }, [user, completedModules, methodologyCompleted]);

  const isModuleCompleted = useCallback((moduleKey: string) => {
    return completedModules.has(moduleKey);
  }, [completedModules]);

  return {
    completedModules,
    methodologyCompleted,
    planCompleted,
    loading,
    completeModule,
    isModuleCompleted,
    completedCount: completedModules.size,
    totalModules: ALL_MODULE_KEYS.length,
  };
}
