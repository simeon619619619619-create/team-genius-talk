import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LAST_VIEWED_KEY = "assistant_last_viewed";
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

interface DailyTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export function useDailyTasks() {
  const { user } = useAuth();
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [showBadge, setShowBadge] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const markAsViewed = useCallback(() => {
    localStorage.setItem(LAST_VIEWED_KEY, Date.now().toString());
    setShowBadge(false);
  }, []);

  const shouldShowBadge = useCallback((pending: number): boolean => {
    if (pending === 0) return false;
    
    const lastViewed = localStorage.getItem(LAST_VIEWED_KEY);
    if (!lastViewed) return true;
    
    const timeSinceViewed = Date.now() - parseInt(lastViewed, 10);
    return timeSinceViewed >= EIGHT_HOURS_MS;
  }, []);

  const fetchDailyTasks = useCallback(async () => {
    if (!user) {
      setDailyTasks([]);
      setPendingCount(0);
      setShowBadge(false);
      setIsLoading(false);
      return;
    }

    try {
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

      const { data: steps } = await supabase
        .from('plan_steps')
        .select('id, completed')
        .eq('project_id', project.id);

      const hasIncompletePlanStep = steps?.some(s => !s.completed) || false;

      const today = new Date();
      const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

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

      let pending = tasks.filter(t => !t.isCompleted).length;
      if (tasks.length === 0 && hasIncompletePlanStep) {
        pending = 1;
      }

      setDailyTasks(tasks);
      setPendingCount(pending);
      setShowBadge(shouldShowBadge(pending));
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, shouldShowBadge]);

  useEffect(() => {
    fetchDailyTasks();
  }, [fetchDailyTasks]);

  return {
    dailyTasks,
    pendingCount,
    showBadge,
    isLoading,
    markAsViewed,
    refetch: fetchDailyTasks,
  };
}
