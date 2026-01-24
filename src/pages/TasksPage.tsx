import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { DailyTasksView } from "@/components/tasks/DailyTasksView";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Loader2, LayoutGrid, Calendar } from "lucide-react";

export default function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("kanban");
  const {
    tasks,
    loading,
    addTask,
    updateTaskStatus,
    updateTaskDayOfWeek,
    deleteTask,
    addSubtask,
    updateSubtaskStatus,
    deleteSubtask,
  } = useTasks();

  const handleAddTask = async (taskData: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    assignee_name?: string;
    team_name?: string;
    due_date?: string;
  }) => {
    await addTask({
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      assignee_name: taskData.assignee_name,
      team_name: taskData.team_name,
      due_date: taskData.due_date,
    });
  };

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in-progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <h2 className="text-2xl font-display font-bold text-foreground">Моля, влезте в акаунта си</h2>
          <p className="text-muted-foreground">За да виждате и управлявате задачите си, трябва да сте влезли.</p>
          <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground rounded-xl font-medium">
            Вход / Регистрация
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">Задачи</h1>
            <p className="mt-0.5 md:mt-2 text-xs md:text-base text-muted-foreground truncate">
              Управлявайте задачите на вашия екип
            </p>
          </div>
          <AddTaskDialog onAddTask={handleAddTask} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="kanban" className="flex items-center gap-1.5 text-xs md:text-sm px-2.5 md:px-3">
              <LayoutGrid className="h-3.5 w-3.5" />
              Канбан
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-1.5 text-xs md:text-sm px-2.5 md:px-3">
              <Calendar className="h-3.5 w-3.5" />
              Ежедневни
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4 md:mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Todo Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-medium text-sm md:text-base text-foreground">
                    За изпълнение
                  </h2>
                  <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-muted text-[10px] md:text-xs font-medium">
                    {todoTasks.length}
                  </span>
                </div>
                <div className="space-y-2 md:space-y-3">
                  {todoTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                      onAddSubtask={addSubtask}
                      onSubtaskStatusChange={updateSubtaskStatus}
                      onDeleteSubtask={deleteSubtask}
                    />
                  ))}
                  {todoTasks.length === 0 && (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">Няма задачи за изпълнение</p>
                  )}
                </div>
              </div>

              {/* In Progress Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-medium text-sm md:text-base text-foreground">
                    В процес
                  </h2>
                  <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-medium">
                    {inProgressTasks.length}
                  </span>
                </div>
                <div className="space-y-2 md:space-y-3">
                  {inProgressTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                      onAddSubtask={addSubtask}
                      onSubtaskStatusChange={updateSubtaskStatus}
                      onDeleteSubtask={deleteSubtask}
                    />
                  ))}
                  {inProgressTasks.length === 0 && (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">Няма задачи в процес</p>
                  )}
                </div>
              </div>

              {/* Done Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-medium text-sm md:text-base text-foreground">
                    Завършени
                  </h2>
                  <span className="flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-success/10 text-success text-[10px] md:text-xs font-medium">
                    {doneTasks.length}
                  </span>
                </div>
                <div className="space-y-2 md:space-y-3">
                  {doneTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                      onAddSubtask={addSubtask}
                      onSubtaskStatusChange={updateSubtaskStatus}
                      onDeleteSubtask={deleteSubtask}
                    />
                  ))}
                  {doneTasks.length === 0 && (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">Няма завършени задачи</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="mt-6">
            <DailyTasksView
              tasks={tasks}
              onAddTask={addTask}
              onUpdateTaskDay={updateTaskDayOfWeek}
              onToggleComplete={updateTaskStatus}
              onDeleteTask={deleteTask}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
