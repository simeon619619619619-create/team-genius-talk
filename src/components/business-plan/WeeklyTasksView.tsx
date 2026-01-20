import { useState } from "react";
import { Sparkles, Loader2, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  isCompleted: boolean;
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

const priorityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-muted",
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

  const toggleTaskComplete = (taskId: string) => {
    onTasksUpdate(
      tasks.map((t) =>
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      )
    );
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

      {tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Натиснете "AI Генериране" за автоматично създаване на задачи
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              базирани на вашите цели, проекти, стратегии и действия
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {tasksByDay.slice(0, 5).map((dayTasks, index) => (
            <Card key={index} className="min-h-[200px]">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {dayNames[index]}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Няма задачи
                  </p>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTaskComplete(task.id)}
                      className={cn(
                        "p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                        priorityColors[task.priority],
                        task.isCompleted && "opacity-50 line-through"
                      )}
                    >
                      <p className="text-xs font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-70">
                          {task.estimatedHours}ч
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
