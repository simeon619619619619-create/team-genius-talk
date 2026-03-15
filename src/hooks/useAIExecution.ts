import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIResult {
  ok: boolean;
  message: string;
  at: string;
}

export function useAIExecution() {
  const [runningTasks, setRunningTasks] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, AIResult>>({});

  const isRunning = useCallback((taskId: string) => !!runningTasks[taskId], [runningTasks]);

  const execute = useCallback(async (
    taskId: string,
    taskTitle: string,
    extraContext?: string
  ): Promise<AIResult> => {
    setRunningTasks(prev => ({ ...prev, [taskId]: true }));

    try {
      const prompt = extraContext
        ? `${extraContext}\n\nИзпълни тази задача и дай кратък резултат (макс 3 изречения). Ако не можеш, обясни какво ти трябва:\n\n"${taskTitle}"`
        : `Изпълни тази задача и дай кратък резултат (макс 3 изречения). Ако не можеш, обясни какво ти трябва:\n\n"${taskTitle}"`;

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: [{ role: "user", content: prompt }],
          context: "business",
        },
      });

      const message = error
        ? "Грешка при изпълнение"
        : data?.content || "Задачата е изпълнена.";

      const ok = !error
        && !message.toLowerCase().includes("не мога")
        && !message.toLowerCase().includes("нямам достъп")
        && !message.toLowerCase().includes("нямам възможност");

      const result: AIResult = { ok, message, at: new Date().toLocaleTimeString("bg-BG") };
      setResults(prev => ({ ...prev, [taskId]: result }));
      return result;
    } catch {
      const result: AIResult = { ok: false, message: "Грешка при връзката с AI", at: new Date().toLocaleTimeString("bg-BG") };
      setResults(prev => ({ ...prev, [taskId]: result }));
      return result;
    } finally {
      setRunningTasks(prev => ({ ...prev, [taskId]: false }));
    }
  }, []);

  const clearResult = useCallback((taskId: string) => {
    setResults(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  return { execute, isRunning, runningTasks, results, clearResult };
}
