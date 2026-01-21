import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      const { data: subtasksData, error: subtasksError } = await supabase
        .from("subtasks")
        .select("*");

      if (subtasksError) throw subtasksError;

      const tasksWithSubtasks = (tasksData || []).map((task) => ({
        ...task,
        status: task.status as DbTask["status"],
        priority: task.priority as DbTask["priority"],
        subtasks: (subtasksData || [])
          .filter((s) => s.task_id === task.id)
          .map((s) => ({
            ...s,
            status: s.status as DbSubtask["status"],
          })),
      }));

      setTasks(tasksWithSubtasks);
    } catch (error: any) {
      toast.error("Грешка при зареждане на задачите");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const addTask = async (taskData: {
    title: string;
    description?: string;
    status?: "todo" | "in-progress" | "done";
    priority?: "low" | "medium" | "high";
    assignee_name?: string;
    team_name?: string;
    due_date?: string;
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
          title: taskData.title,
          description: taskData.description || null,
          status: taskData.status || "todo",
          priority: taskData.priority || "medium",
          assignee_name: taskData.assignee_name || null,
          team_name: taskData.team_name || null,
          due_date: taskData.due_date || null,
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
    deleteTask,
    addSubtask,
    updateSubtaskStatus,
    deleteSubtask,
    refetch: fetchTasks,
  };
}
