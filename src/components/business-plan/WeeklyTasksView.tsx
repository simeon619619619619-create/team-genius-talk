import { useState } from "react";
import { Sparkles, Loader2, Calendar, CheckCircle2, Clock, Briefcase, Target, Zap, Edit2, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ManualTaskDialog } from "./ManualTaskDialog";

export interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  isCompleted: boolean;
  taskType?: "project" | "strategy" | "action";
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: string;
}

interface PlanItem {
  id: string;
  type: "project" | "strategy" | "action";
  title: string;
  description: string;
  owner: string;
  deadline: string;
  expectedResults: string;
  status: string;
  priority: "high" | "medium" | "low";
}

interface WeeklyTasksViewProps {
  weekNumber: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  goals: Goal[];
  items: PlanItem[];
  tasks: WeeklyTask[];
  onTasksUpdate: (tasks: WeeklyTask[]) => void;
}

const dayNames = ["Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];

// Color coding based on task type
const taskTypeColors = {
  project: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    icon: Briefcase,
  },
  strategy: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600",
    icon: Target,
  },
  action: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600",
    icon: Zap,
  },
};

const priorityIndicators = {
  high: "border-l-4 border-l-destructive",
  medium: "border-l-4 border-l-warning",
  low: "border-l-4 border-l-muted-foreground",
};

export function WeeklyTasksView({
  weekNumber,
  quarter,
  year,
  goals,
  items,
  tasks,
  onTasksUpdate,
}: WeeklyTasksViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTasks = async () => {
    if (goals.length === 0 && items.length === 0) {
      toast.error("Добавете цели или проекти/стратегии/действия преди да генерирате задачи");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-weekly-tasks", {
        body: {
          goals: goals.map(g => ({
            title: g.title,
            description: g.description,
            category: g.category,
            priority: g.priority,
          })),
          items: items.map(i => ({
            type: i.type,
            title: i.title,
            description: i.description,
            owner: i.owner,
            deadline: i.deadline,
            expectedResults: i.expectedResults,
            priority: i.priority,
          })),
          weekNumber,
          quarter,
          year,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const newTasks: WeeklyTask[] = data.tasks.map((t: Omit<WeeklyTask, "id" | "isCompleted">) => ({
        ...t,
        id: crypto.randomUUID(),
        isCompleted: false,
      }));

      onTasksUpdate(newTasks);
      toast.success(`Генерирани са ${newTasks.length} задачи за седмица ${weekNumber}`);
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast.error("Грешка при генериране на задачи");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const taskToUpdate = tasks.find((t) => t.id === taskId);
    if (!taskToUpdate) return;
    
    const newCompletedState = !taskToUpdate.isCompleted;
    
    // Update local state immediately for responsive UI
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, isCompleted: newCompletedState } : t
    );
    onTasksUpdate(updatedTasks);
    
    // Update in database
    try {
      const { error } = await supabase
        .from("weekly_tasks")
        .update({ is_completed: newCompletedState })
        .eq("id", taskId);
      
      if (error) {
        console.error("Error updating task:", error);
        // Revert on error
        onTasksUpdate(tasks);
        toast.error("Грешка при обновяване на задачата");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      onTasksUpdate(tasks);
      toast.error("Грешка при обновяване на задачата");
    }
  };

  const handleAddTask = (taskData: Omit<WeeklyTask, "id" | "isCompleted"> & { id?: string }) => {
    const newTask: WeeklyTask = {
      id: crypto.randomUUID(),
      ...taskData,
      isCompleted: false,
    };
    onTasksUpdate([...tasks, newTask]);
  };

  const handleEditTask = (taskData: Omit<WeeklyTask, "id" | "isCompleted"> & { id?: string }) => {
    if (!taskData.id) return;
    onTasksUpdate(
      tasks.map((t) =>
        t.id === taskData.id
          ? { ...t, ...taskData, isCompleted: t.isCompleted }
          : t
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    onTasksUpdate(tasks.filter((t) => t.id !== taskId));
    toast.success("Задачата е изтрита");
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newDayOfWeek = parseInt(destination.droppableId.replace("day-", ""));
    
    const updatedTasks = tasks.map((task) => {
      if (task.id === draggableId) {
        return { ...task, dayOfWeek: newDayOfWeek };
      }
      return task;
    });

    onTasksUpdate(updatedTasks);
    toast.success("Задачата е преместена");
  };

  const tasksByDay = dayNames.map((_, index) =>
    tasks.filter((t) => t.dayOfWeek === index + 1)
  );

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Седмица {weekNumber}</h3>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount}/{tasks.length}
            </Badge>
          )}
          {totalHours > 0 && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {totalHours}ч
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
              <span className="text-muted-foreground">Проект</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
              <span className="text-muted-foreground">Стратегия</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
              <span className="text-muted-foreground">Действие</span>
            </div>
          </div>
          <ManualTaskDialog onSave={handleAddTask} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateTasks}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {tasks.length > 0 ? "Регенерирай" : "AI Генериране"}
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Добавете задачи ръчно или използвайте "AI Генериране"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              за автоматично създаване базирано на вашите цели
            </p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {tasksByDay.slice(0, 5).map((dayTasks, index) => (
              <Droppable droppableId={`day-${index + 1}`} key={index}>
                {(provided, snapshot) => (
                  <Card 
                    className={cn(
                      "min-h-[200px] transition-colors",
                      snapshot.isDraggingOver && "ring-2 ring-primary/50 bg-primary/5"
                    )}
                  >
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {dayNames[index]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent 
                      className="px-3 pb-3 space-y-2"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {dayTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Няма задачи
                        </p>
                      ) : (
                        dayTasks.map((task, taskIndex) => {
                          const taskType = task.taskType || "action";
                          const typeStyle = taskTypeColors[taskType];
                          const Icon = typeStyle.icon;
                          
                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={taskIndex}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "p-2 rounded-lg border cursor-grab transition-all group/task",
                                    typeStyle.bg,
                                    typeStyle.border,
                                    priorityIndicators[task.priority],
                                    task.isCompleted && "opacity-50",
                                    snapshot.isDragging && "shadow-lg ring-2 ring-primary cursor-grabbing"
                                  )}
                                >
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={(e) => toggleTaskComplete(task.id, e)}
                                      className="mt-0.5"
                                    >
                                      <Icon className={cn("h-3 w-3 shrink-0", typeStyle.text)} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "text-xs font-medium",
                                        task.isCompleted && "line-through"
                                      )}>
                                        {task.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] opacity-70">
                                          {task.estimatedHours}ч
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                      <ManualTaskDialog
                                        task={task}
                                        onSave={handleEditTask}
                                        trigger={
                                          <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 hover:bg-background/50 rounded"
                                          >
                                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                                          </button>
                                        }
                                      />
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1 hover:bg-background/50 rounded"
                                          >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Изтриване на задача</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Сигурни ли сте, че искате да изтриете "{task.title}"?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Отказ</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => handleDeleteTask(task.id)}
                                              className="bg-destructive text-destructive-foreground"
                                            >
                                              Изтрий
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </CardContent>
                  </Card>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
