import { supabase } from "@/integrations/supabase/client";
import { WeeklyTask } from "@/components/business-plan/WeeklyTasksView";

// Calculate the actual date from year, week number, and day of week
function getDateFromWeekDay(year: number, weekNumber: number, dayOfWeek: number): string {
  // Get the first day of the year
  const jan1 = new Date(year, 0, 1);
  // Calculate the day of week for Jan 1 (0 = Sunday, 1 = Monday, etc.)
  const jan1DayOfWeek = jan1.getDay() || 7; // Convert Sunday from 0 to 7
  
  // Calculate the date of the Monday of week 1
  const week1Monday = new Date(jan1);
  if (jan1DayOfWeek <= 4) {
    // Jan 1 is Mon-Thu, week 1 starts on the previous Monday
    week1Monday.setDate(jan1.getDate() - jan1DayOfWeek + 1);
  } else {
    // Jan 1 is Fri-Sun, week 1 starts on the next Monday
    week1Monday.setDate(jan1.getDate() + (8 - jan1DayOfWeek));
  }
  
  // Calculate the target date
  const targetDate = new Date(week1Monday);
  targetDate.setDate(week1Monday.getDate() + (weekNumber - 1) * 7 + (dayOfWeek - 1));
  
  return targetDate.toISOString().split("T")[0];
}

// Day name in Bulgarian
const dayNames: Record<number, string> = {
  1: "Понеделник",
  2: "Вторник",
  3: "Сряда",
  4: "Четвъртък",
  5: "Петък",
  6: "Събота",
  7: "Неделя",
};

export async function syncWeeklyTaskToTasks(
  task: WeeklyTask,
  weekNumber: number,
  year: number,
  businessPlanId: string,
  projectId: string,
  userId: string
): Promise<string | null> {
  try {
    // Calculate the due date
    const dueDate = getDateFromWeekDay(year, weekNumber, task.dayOfWeek);
    
    // Build description with source info
    const sourceInfo = `📅 Седмица ${weekNumber}, ${dayNames[task.dayOfWeek] || "Ден " + task.dayOfWeek}\n📋 Източник: Бизнес план`;
    const fullDescription = task.description 
      ? `${task.description}\n\n---\n${sourceInfo}` 
      : sourceInfo;

    // Check if a linked task already exists
    const { data: existingTask } = await supabase
      .from("tasks")
      .select("id")
      .eq("source_weekly_task_id", task.id)
      .maybeSingle();

    if (existingTask) {
      // Update existing task
      const { error } = await supabase
        .from("tasks")
        .update({
          title: task.title,
          description: fullDescription,
          priority: task.priority,
          status: task.isCompleted ? "done" : "todo",
          due_date: dueDate,
          day_of_week: task.dayOfWeek,
          source_week_number: weekNumber,
        })
        .eq("id", existingTask.id);

      if (error) {
        console.error("Error updating linked task:", error);
        return null;
      }
      return existingTask.id;
    } else {
      // Create new task
      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert({
          title: task.title,
          description: fullDescription,
          priority: task.priority,
          status: task.isCompleted ? "done" : "todo",
          due_date: dueDate,
          day_of_week: task.dayOfWeek,
          user_id: userId,
          project_id: projectId,
          source_weekly_task_id: task.id,
          source_week_number: weekNumber,
          source_business_plan_id: businessPlanId,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating linked task:", error);
        return null;
      }

      // Update weekly_task with linked_task_id
      await supabase
        .from("weekly_tasks")
        .update({ linked_task_id: newTask.id })
        .eq("id", task.id);

      return newTask.id;
    }
  } catch (error) {
    console.error("Error syncing weekly task to tasks:", error);
    return null;
  }
}

export async function deleteLinkedTask(weeklyTaskId: string): Promise<void> {
  try {
    // Find and delete the linked task
    const { data: linkedTask } = await supabase
      .from("tasks")
      .select("id")
      .eq("source_weekly_task_id", weeklyTaskId)
      .maybeSingle();

    if (linkedTask) {
      await supabase.from("tasks").delete().eq("id", linkedTask.id);
    }
  } catch (error) {
    console.error("Error deleting linked task:", error);
  }
}

export async function syncTaskToWeeklyTask(
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    dayOfWeek?: number;
  }
): Promise<void> {
  try {
    // Find the linked weekly task
    const { data: task } = await supabase
      .from("tasks")
      .select("source_weekly_task_id")
      .eq("id", taskId)
      .maybeSingle();

    if (!task?.source_weekly_task_id) return;

    // Update the weekly task
    const weeklyTaskUpdates: Record<string, unknown> = {};
    if (updates.title) weeklyTaskUpdates.title = updates.title;
    if (updates.priority) weeklyTaskUpdates.priority = updates.priority;
    if (updates.status) weeklyTaskUpdates.is_completed = updates.status === "done";
    if (updates.dayOfWeek) weeklyTaskUpdates.day_of_week = updates.dayOfWeek;

    if (Object.keys(weeklyTaskUpdates).length > 0) {
      await supabase
        .from("weekly_tasks")
        .update(weeklyTaskUpdates)
        .eq("id", task.source_weekly_task_id);
    }
  } catch (error) {
    console.error("Error syncing task to weekly task:", error);
  }
}
