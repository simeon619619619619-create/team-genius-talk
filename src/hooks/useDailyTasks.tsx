import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DailyTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export function useDailyTasks() {
  const { user } = useAuth();
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDailyTasks = useCallback(async () => {
    if (!user) {
      setDailyTasks([]);
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch user's project
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!project) {
        setIsLoading(false);
        return;
      }

      // Check if there's an incomplete plan step (counts as 1 pending task)
      const { data: steps } = await supabase
        .from('plan_steps')
        .select('id, completed')
        .eq('project_id', project.id);

      const hasIncompletePlanStep = steps?.some(s => !s.completed) || false;

      // Fetch today's tasks from weekly_tasks
      const today = new Date();
      const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

      // Get business_plan_id
      const { data: businessPlan } = await supabase
        .from('business_plans')
        .select('id')
        .eq('project_id', project.id)
        .limit(1)
        .maybeSingle();

      let tasks: DailyTask[] = [];

      if (businessPlan) {
        const { data: weeklyTasks } = await supabase
          .from('weekly_tasks')
          .select('id, title, is_completed')
          .eq('business_plan_id', businessPlan.id)
          .eq('week_number', weekNumber)
          .eq('day_of_week', dayOfWeek);

        if (weeklyTasks) {
          tasks = weeklyTasks.map(t => ({
            id: t.id,
            title: t.title,
            isCompleted: t.is_completed || false,
          }));
        }
      }

      // If no weekly tasks but there's an incomplete step, show 1 pending
      let pending = tasks.filter(t => !t.isCompleted).length;
      if (tasks.length === 0 && hasIncompletePlanStep) {
        pending = 1; // Show notification for continuing plan
      }

      setDailyTasks(tasks);
      setPendingCount(pending);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDailyTasks();
  }, [fetchDailyTasks]);

  return {
    dailyTasks,
    pendingCount,
    isLoading,
    refetch: fetchDailyTasks,
  };
}
