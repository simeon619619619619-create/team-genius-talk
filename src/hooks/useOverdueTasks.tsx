import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OverdueTask {
  id: string;
  title: string;
  description?: string;
  originalWeekNumber: number;
  originalDayOfWeek: number;
  priority: "low" | "medium" | "high";
  taskType?: string;
  businessPlanId: string;
  daysOverdue: number;
}

export function useOverdueTasks() {
  const { user } = useAuth();
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current week number and day
  const getCurrentWeekAndDay = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    return { weekNumber, dayOfWeek, today };
  }, []);

  const fetchOverdueTasks = useCallback(async () => {
    if (!user) {
      setOverdueTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      // Get user's project
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!project) {
        setIsLoading(false);
        return;
      }

      // Get business plan
      const { data: businessPlan } = await supabase
        .from("business_plans")
        .select("id")
        .eq("project_id", project.id)
        .limit(1)
        .maybeSingle();

      if (!businessPlan) {
        setIsLoading(false);
        return;
      }

      const { weekNumber, dayOfWeek } = getCurrentWeekAndDay();

      // Fetch all incomplete tasks that are in the past
      // A task is overdue if:
      // 1. Its week_number is less than current week, OR
      // 2. Its week_number equals current week AND day_of_week is less than today
      const { data: tasks, error } = await supabase
        .from("weekly_tasks")
        .select("*")
        .eq("business_plan_id", businessPlan.id)
        .eq("is_completed", false)
        .or(
          `week_number.lt.${weekNumber},and(week_number.eq.${weekNumber},day_of_week.lt.${dayOfWeek})`
        );

      if (error) {
        console.error("Error fetching overdue tasks:", error);
        setIsLoading(false);
        return;
      }

      // Calculate days overdue for each task
      const overdueWithDays: OverdueTask[] = (tasks || []).map((task) => {
        // Calculate days difference
        const taskWeek = task.week_number;
        const taskDay = task.day_of_week || 1;

        // Weeks difference * 7 + days difference
        const weeksDiff = weekNumber - taskWeek;
        const daysDiff = dayOfWeek - taskDay;
        const daysOverdue = weeksDiff * 7 + daysDiff;

        return {
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          originalWeekNumber: task.week_number,
          originalDayOfWeek: task.day_of_week || 1,
          priority: (task.priority as "low" | "medium" | "high") || "medium",
          taskType: task.task_type,
          businessPlanId: task.business_plan_id,
          daysOverdue: Math.max(0, daysOverdue),
        };
      });

      // Sort by most overdue first
      overdueWithDays.sort((a, b) => b.daysOverdue - a.daysOverdue);

      setOverdueTasks(overdueWithDays);
    } catch (error) {
      console.error("Error fetching overdue tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getCurrentWeekAndDay]);

  // Reschedule task to a new week/day
  const rescheduleTask = useCallback(
    async (taskId: string, newWeekNumber: number, newDayOfWeek: number) => {
      const { error } = await supabase
        .from("weekly_tasks")
        .update({
          week_number: newWeekNumber,
          day_of_week: newDayOfWeek,
        })
        .eq("id", taskId);

      if (error) {
        console.error("Error rescheduling task:", error);
        return false;
      }

      // Remove from overdue list
      setOverdueTasks((prev) => prev.filter((t) => t.id !== taskId));
      return true;
    },
    []
  );

  // Reschedule task to today
  const rescheduleToToday = useCallback(
    async (taskId: string) => {
      const { weekNumber, dayOfWeek } = getCurrentWeekAndDay();
      return rescheduleTask(taskId, weekNumber, dayOfWeek);
    },
    [rescheduleTask, getCurrentWeekAndDay]
  );

  // Reschedule task to tomorrow
  const rescheduleToTomorrow = useCallback(
    async (taskId: string) => {
      const { weekNumber, dayOfWeek } = getCurrentWeekAndDay();
      // Handle week rollover if tomorrow is next week
      if (dayOfWeek === 7) {
        return rescheduleTask(taskId, weekNumber + 1, 1);
      }
      return rescheduleTask(taskId, weekNumber, dayOfWeek + 1);
    },
    [rescheduleTask, getCurrentWeekAndDay]
  );

  // Mark task as complete
  const completeTask = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from("weekly_tasks")
      .update({ is_completed: true })
      .eq("id", taskId);

    if (error) {
      console.error("Error completing task:", error);
      return false;
    }

    setOverdueTasks((prev) => prev.filter((t) => t.id !== taskId));
    return true;
  }, []);

  useEffect(() => {
    fetchOverdueTasks();
  }, [fetchOverdueTasks]);

  return {
    overdueTasks,
    isLoading,
    rescheduleTask,
    rescheduleToToday,
    rescheduleToTomorrow,
    completeTask,
    refetch: fetchOverdueTasks,
    getCurrentWeekAndDay,
  };
}
