import { useState } from "react";
import { Calendar, Loader2, CheckCircle2, Clock, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScheduleTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  weekNumber: number;
  timeSlot: string;
  taskType: string;
  channel?: string;
}

interface GenerateScheduleDialogProps {
  projectId: string;
  allStepsCompleted: boolean;
}

const dayNames = ["", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];

const priorityColors = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const taskTypeColors: Record<string, string> = {
  marketing: "bg-primary/15 text-primary",
  sales: "bg-success/15 text-success",
  content: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  admin: "bg-muted text-muted-foreground",
  meeting: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

export function GenerateScheduleDialog({ projectId, allStepsCompleted }: GenerateScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<ScheduleTask[]>([]);
  const [tasksByWeek, setTasksByWeek] = useState<Record<number, ScheduleTask[]>>({});
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedTasks([]);
    setTasksByWeek({});

    try {
      const { data, error } = await supabase.functions.invoke("generate-full-schedule", {
        body: {
          projectId,
          weeksToGenerate: 4,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.message || data.error);
        return;
      }

      setGeneratedTasks(data.tasks);
      setTasksByWeek(data.tasksByWeek);
      setSelectedWeek(data.startWeek);
      toast.success(`Генерирани са ${data.tasks.length} задачи за ${data.weeksGenerated} седмици!`);
    } catch (error: any) {
      console.error("Error generating schedule:", error);
      toast.error(error.message || "Грешка при генериране на плана");
    } finally {
      setIsGenerating(false);
    }
  };

  const weeks = Object.keys(tasksByWeek).map(Number).sort((a, b) => a - b);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className={cn(
            "gap-1.5 rounded-xl text-xs md:text-sm px-2.5 md:px-4 h-8 md:h-9 transition-all duration-300",
            allStepsCompleted 
              ? "gradient-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95" 
              : "opacity-50 cursor-not-allowed"
          )}
          disabled={!allStepsCompleted}
        >
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Генерирай</span> план
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Автоматичен седмичен план
          </DialogTitle>
          <DialogDescription>
            Базирано на вашите отговори, ще генерираме детайлен план по дни и часове за следващите 4 седмици.
          </DialogDescription>
        </DialogHeader>

        {generatedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Готови ли сте?</h3>
              <p className="text-muted-foreground max-w-md">
                AI ще анализира вашия бизнес, маркетинг стратегия и цели, за да създаде персонализиран седмичен план.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2 rounded-xl px-8 py-6 text-lg gradient-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Генерира се...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Генерирай план
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Week selector */}
            <div className="w-48 border-r border-border pr-4 flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Седмици</p>
              {weeks.map((week) => (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-200",
                    selectedWeek === week
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-secondary/60"
                  )}
                >
                  <span>Седмица {week}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tasksByWeek[week]?.length || 0}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Tasks for selected week */}
            <ScrollArea className="flex-1">
              {selectedWeek && tasksByWeek[selectedWeek] && (
                <div className="space-y-4 pr-4">
                  {[1, 2, 3, 4, 5].map((day) => {
                    const dayTasks = tasksByWeek[selectedWeek].filter(t => t.dayOfWeek === day);
                    if (dayTasks.length === 0) return null;
                    
                    return (
                      <div key={day} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          {dayNames[day]}
                        </h4>
                        <div className="space-y-2 pl-6">
                          {dayTasks
                            .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                            .map((task, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "p-3 rounded-xl border transition-all duration-200 hover:shadow-md",
                                  priorityColors[task.priority]
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{task.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {task.description}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <Badge className={cn("text-xs", taskTypeColors[task.taskType] || taskTypeColors.admin)}>
                                      {task.channel || task.taskType}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {task.timeSlot}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {generatedTasks.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Генерирани {generatedTasks.length} задачи
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGeneratedTasks([])} className="rounded-xl">
                Генерирай отново
              </Button>
              <Button 
                onClick={() => {
                  toast.success("Планът е запазен! Можете да го видите в секция Бизнес план.");
                  setOpen(false);
                }} 
                className="gap-2 rounded-xl gradient-primary"
              >
                <CheckCircle2 className="h-4 w-4" />
                Запази плана
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
