import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { toast } from "sonner";

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assignee_name: string | null;
  team_name: string | null;
  due_date: string | null;
  day_of_week: number | null;
  project_id: string | null;
  created_at: string;
  subtasks?: DbSubtask[];
}

export interface DbSubtask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  assignee_name: string | null;
  due_date: string | null;
  handoff_to: string | null;
}

export function useTasks() {
  const { user } = useAuth();
  const { projectId } = useCurrentProject();
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      // Build query based on whether we have a project
      let query = supabase.from("tasks").select("*");
      
      if (projectId) {
        // Only show tasks for this specific project
        query = query.eq("project_id", projectId);
      } else {
        // No project selected, show only user's tasks without project (orphaned tasks)
        query = query.eq("user_id", user.id).is("project_id", null);
      }
      
      const { data: tasksData, error: tasksError } = await query.order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      const taskIds = (tasksData || []).map((t) => t.id);
      
      let subtasksData: any[] = [];
      if (taskIds.length > 0) {
        const { data, error: subtasksError } = await supabase
          .from("subtasks")
          .select("*")
          .in("task_id", taskIds);

        if (subtasksError) throw subtasksError;
        subtasksData = data || [];
      }

      const tasksWithSubtasks = (tasksData || []).map((task) => ({
        ...task,
        status: task.status as DbTask["status"],
        priority: task.priority as DbTask["priority"],
        subtasks: subtasksData
          .filter((s) => s.task_id === task.id)
          .map((s) => ({
            ...s,
            status: s.status as DbSubtask["status"],
          })),
      }));

      setTasks(tasksWithSubtasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Грешка при зареждане на задачите");
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (taskData: {
    title: string;
    description?: string;
    status?: "todo" | "in-progress" | "done";
    priority?: "low" | "medium" | "high";
    assignee_name?: string;
    team_name?: string;
    due_date?: string;
    day_of_week?: number;
  }) => {
    if (!user) {
      toast.error("Моля, влезте в акаунта си");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          title: taskData.title,
          description: taskData.description || null,
          status: taskData.status || "todo",
          priority: taskData.priority || "medium",
          assignee_name: taskData.assignee_name || null,
          team_name: taskData.team_name || null,
          due_date: taskData.due_date || null,
          day_of_week: taskData.day_of_week || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: DbTask = {
        ...data,
        status: data.status as DbTask["status"],
        priority: data.priority as DbTask["priority"],
        subtasks: [],
      };
      setTasks((prev) => [newTask, ...prev]);
      toast.success("Задачата е добавена");
      return newTask;
    } catch (error: any) {
      toast.error("Грешка при добавяне на задача");
      return null;
    }
  };

  const updateTaskStatus = async (taskId: string, status: DbTask["status"]) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
    } catch (error: any) {
      toast.error("Грешка при обновяване на задача");
    }
  };

  const updateTaskDayOfWeek = async (taskId: string, dayOfWeek: number | null) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ day_of_week: dayOfWeek })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, day_of_week: dayOfWeek } : t))
      );
    } catch (error: any) {
      toast.error("Грешка при обновяване на задача");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Задачата е изтрита");
    } catch (error: any) {
      toast.error("Грешка при изтриване на задача");
    }
  };

  const addSubtask = async (
    taskId: string,
    subtaskData: {
      title: string;
      description?: string;
      assignee_name?: string;
      due_date?: string;
      handoff_to?: string;
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from("subtasks")
        .insert({
          task_id: taskId,
          title: subtaskData.title,
          description: subtaskData.description || null,
          assignee_name: subtaskData.assignee_name || null,
          due_date: subtaskData.due_date || null,
          handoff_to: subtaskData.handoff_to || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSubtask: DbSubtask = {
        ...data,
        status: data.status as DbSubtask["status"],
      };

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
            : t
        )
      );
      toast.success("Подзадачата е добавена");
    } catch (error: any) {
      toast.error("Грешка при добавяне на подзадача");
    }
  };

  const updateSubtaskStatus = async (
    taskId: string,
    subtaskId: string,
    status: DbSubtask["status"]
  ) => {
    try {
      const { error } = await supabase
        .from("subtasks")
        .update({ status })
        .eq("id", subtaskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: (t.subtasks || []).map((s) =>
                  s.id === subtaskId ? { ...s, status } : s
                ),
              }
            : t
        )
      );
    } catch (error: any) {
      toast.error("Грешка при обновяване на подзадача");
    }
  };

  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    try {
      const { error } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtaskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: (t.subtasks || []).filter((s) => s.id !== subtaskId) }
            : t
        )
      );
      toast.success("Подзадачата е изтрита");
    } catch (error: any) {
      toast.error("Грешка при изтриване на подзадача");
    }
  };

  return {
    tasks,
    loading,
    addTask,
    updateTaskStatus,
    updateTaskDayOfWeek,
    deleteTask,
    addSubtask,
    updateSubtaskStatus,
    deleteSubtask,
    refetch: fetchTasks,
  };
}
