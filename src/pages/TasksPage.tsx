import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { AITaskBreakdownDialog } from "@/components/tasks/AITaskBreakdownDialog";
import { mockTasks, mockTeams, mockMembers } from "@/data/mockData";
import { Task, Subtask } from "@/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const handleStatusChange = (taskId: string, status: Task["status"]) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
  };

  const handleAddTask = (taskData: Omit<Task, "id" | "createdAt">) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
  };

  const handleAddMultipleTasks = (tasksData: Omit<Task, "id" | "createdAt">[]) => {
    const newTasks: Task[] = tasksData.map((taskData, index) => ({
      ...taskData,
      id: (Date.now() + index).toString(),
      createdAt: new Date().toISOString(),
    }));
    setTasks([...newTasks, ...tasks]);
  };

  const handleAddSubtask = (taskId: string, subtaskData: Omit<Subtask, "id">) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newSubtask: Subtask = {
          ...subtaskData,
          id: Date.now().toString(),
        };
        return {
          ...task,
          subtasks: [...(task.subtasks || []), newSubtask],
        };
      }
      return task;
    }));
  };

  const handleSubtaskStatusChange = (taskId: string, subtaskId: string, status: Subtask["status"]) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId && task.subtasks) {
        return {
          ...task,
          subtasks: task.subtasks.map(subtask =>
            subtask.id === subtaskId ? { ...subtask, status } : subtask
          ),
        };
      }
      return task;
    }));
  };

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in-progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Задачи</h1>
            <p className="mt-2 text-muted-foreground">
              Управлявайте задачите на вашия екип
            </p>
          </div>
          <div className="flex gap-3">
            <AITaskBreakdownDialog 
              teams={mockTeams} 
              members={mockMembers} 
              onAddTasks={handleAddMultipleTasks}
            />
            <AddTaskDialog 
              teams={mockTeams} 
              members={mockMembers} 
              onAddTask={handleAddTask}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Todo Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-foreground">
                За изпълнение
              </h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {todoTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {todoTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={mockMembers.find(m => m.id === task.assigneeId)}
                  members={mockMembers}
                  onStatusChange={handleStatusChange}
                  onAddSubtask={handleAddSubtask}
                  onSubtaskStatusChange={handleSubtaskStatusChange}
                />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-foreground">
                В процес
              </h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={mockMembers.find(m => m.id === task.assigneeId)}
                  members={mockMembers}
                  onStatusChange={handleStatusChange}
                  onAddSubtask={handleAddSubtask}
                  onSubtaskStatusChange={handleSubtaskStatusChange}
                />
              ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-foreground">
                Завършени
              </h2>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success text-xs font-medium">
                {doneTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={mockMembers.find(m => m.id === task.assigneeId)}
                  members={mockMembers}
                  onStatusChange={handleStatusChange}
                  onAddSubtask={handleAddSubtask}
                  onSubtaskStatusChange={handleSubtaskStatusChange}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
