import { useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, ArrowRight, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOverdueTasks, OverdueTask } from "@/hooks/useOverdueTasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const dayNames = ["Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];

const priorityColors = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

interface OverdueTasksSectionProps {
  compact?: boolean;
  maxTasks?: number;
}

export function OverdueTasksSection({ compact = false, maxTasks = 5 }: OverdueTasksSectionProps) {
  const { overdueTasks, rescheduleToToday, rescheduleToTomorrow, completeTask, isLoading } =
    useOverdueTasks();
  const [isExpanded, setIsExpanded] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (isLoading || overdueTasks.length === 0) {
    return null;
  }

  const displayedTasks = isExpanded ? overdueTasks.slice(0, maxTasks) : overdueTasks.slice(0, 2);
  const hasMore = overdueTasks.length > maxTasks;

  const handleRescheduleToday = async (task: OverdueTask) => {
    setProcessingId(task.id);
    const success = await rescheduleToToday(task.id);
    setProcessingId(null);
    if (success) {
      toast.success(`"${task.title}" преместена за днес`);
    } else {
      toast.error("Грешка при преместване на задачата");
    }
  };

  const handleRescheduleTomorrow = async (task: OverdueTask) => {
    setProcessingId(task.id);
    const success = await rescheduleToTomorrow(task.id);
    setProcessingId(null);
    if (success) {
      toast.success(`"${task.title}" преместена за утре`);
    } else {
      toast.error("Грешка при преместване на задачата");
    }
  };

  const handleComplete = async (task: OverdueTask) => {
    setProcessingId(task.id);
    const success = await completeTask(task.id);
    setProcessingId(null);
    if (success) {
      toast.success(`"${task.title}" маркирана като завършена`);
    } else {
      toast.error("Грешка при завършване на задачата");
    }
  };

  return (
    <Card className={cn(
      "border-destructive/30 bg-destructive/5",
      compact ? "p-3" : "p-4 md:p-5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
              Закъснели задачи
            </h3>
            <p className="text-xs text-muted-foreground">
              {overdueTasks.length} {overdueTasks.length === 1 ? "задача чака" : "задачи чакат"} внимание
            </p>
          </div>
        </div>
        {overdueTasks.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {displayedTasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border bg-card/80 transition-all",
              priorityColors[task.priority],
              processingId === task.id && "opacity-50"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium", compact ? "text-sm" : "text-sm")}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {task.daysOverdue} {task.daysOverdue === 1 ? "ден" : "дни"} закъснение
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  Седм. {task.originalWeekNumber}, {dayNames[task.originalDayOfWeek - 1]}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleComplete(task)}
                disabled={processingId === task.id}
              >
                <CheckCircle2 className="h-4 w-4 text-success" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={processingId === task.id}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Премести
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRescheduleToday(task)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    За днес
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRescheduleTomorrow(task)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    За утре
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Show more indicator */}
      {hasMore && isExpanded && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          + още {overdueTasks.length - maxTasks} задачи
        </p>
      )}
    </Card>
  );
}
