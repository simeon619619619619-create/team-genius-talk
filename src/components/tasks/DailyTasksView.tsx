import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Trash2,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAIExecution } from "@/hooks/useAIExecution";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface DailyTask {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  assignee_name: string | null;
  team_name: string | null;
  due_date: string | null;
  day_of_week: number | null;
}

interface DailyTasksViewProps {
  tasks: DailyTask[];
  onAddTask: (task: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    assignee_name?: string;
    team_name?: string;
    day_of_week?: number;
  }) => void;
  onUpdateTaskDay: (taskId: string, dayOfWeek: number | null) => void;
  onToggleComplete: (taskId: string, status: "todo" | "in-progress" | "done") => void;
  onDeleteTask: (taskId: string) => void;
}

const dayNames = [
  "Понеделник",
  "Вторник",
  "Сряда",
  "Четвъртък",
  "Петък",
  "Събота",
  "Неделя",
];

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
};

export function DailyTasksView({
  tasks,
  onAddTask,
  onUpdateTaskDay,
  onToggleComplete,
  onDeleteTask,
}: DailyTasksViewProps) {
  const { execute, isRunning, results, clearResult } = useAIExecution();
  const [openDays, setOpenDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    assignee_name: "",
    days_of_week: [1] as number[],
  });

  const toggleDay = (day: number) => {
    setOpenDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const getTasksForDay = (day: number) =>
    tasks.filter((t) => t.day_of_week === day);

  const getUnassignedTasks = () =>
    tasks.filter((t) => t.day_of_week === null);

  const getDayStats = (day: number) => {
    const dayTasks = getTasksForDay(day);
    const completed = dayTasks.filter((t) => t.status === "done").length;
    return { completed, total: dayTasks.length };
  };

  const handleSubmit = () => {
    if (!newTask.title.trim() || newTask.days_of_week.length === 0) return;
    
    // Create a task for each selected day
    newTask.days_of_week.forEach((day) => {
      onAddTask({
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        assignee_name: newTask.assignee_name || undefined,
        day_of_week: day,
      });
    });
    
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      assignee_name: "",
      days_of_week: [1],
    });
    setDialogOpen(false);
  };

  const toggleDaySelection = (day: number) => {
    setNewTask((prev) => {
      const isSelected = prev.days_of_week.includes(day);
      if (isSelected) {
        // Don't allow deselecting if it's the last one
        if (prev.days_of_week.length === 1) return prev;
        return { ...prev, days_of_week: prev.days_of_week.filter((d) => d !== day) };
      } else {
        return { ...prev, days_of_week: [...prev.days_of_week, day].sort((a, b) => a - b) };
      }
    });
  };

  const unassignedTasks = getUnassignedTasks();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Ежедневни задачи
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Организирайте задачите си по дни от седмицата
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Добави ежедневна задача
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Нова ежедневна задача</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Заглавие</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Въведете заглавие..."
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Описание на задачата..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Дни (изберете един или повече)</Label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((name, idx) => {
                    const day = idx + 1;
                    const isSelected = newTask.days_of_week.includes(day);
                    return (
                      <Button
                        key={day}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={isSelected ? "gradient-primary text-primary-foreground" : ""}
                        onClick={() => toggleDaySelection(day)}
                      >
                        {name.substring(0, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(v) =>
                      setNewTask((prev) => ({
                        ...prev,
                        priority: v as "low" | "medium" | "high",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Нисък</SelectItem>
                      <SelectItem value="medium">Среден</SelectItem>
                      <SelectItem value="high">Висок</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Отговорник</Label>
                <Input
                  value={newTask.assignee_name}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      assignee_name: e.target.value,
                    }))
                  }
                  placeholder="Име на отговорник..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Отказ
                </Button>
                <Button
                  className="gradient-primary text-primary-foreground"
                  onClick={handleSubmit}
                  disabled={!newTask.title.trim() || newTask.days_of_week.length === 0}
                >
                  Добави {newTask.days_of_week.length > 1 ? `(${newTask.days_of_week.length} дни)` : ""}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unassigned tasks */}
      {unassignedTasks.length > 0 && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Неразпределени задачи ({unassignedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {unassignedTasks.map((task) => {
                const running = isRunning(task.id);
                const aiResult = results[task.id];
                return (
                  <div key={task.id}>
                    <div
                      className={`flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors ${running ? "opacity-70" : ""}`}
                    >
                      <button
                        disabled={running}
                        onClick={async () => {
                          if (task.status === "done") {
                            onToggleComplete(task.id, "todo");
                            return;
                          }
                          const result = await execute(task.id, task.title);
                          if (result.ok) onToggleComplete(task.id, "done");
                        }}
                        className="shrink-0"
                      >
                        {running ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : task.status === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Play className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          task.status === "done"
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      <Select
                        value=""
                        onValueChange={(v) =>
                          onUpdateTaskDay(task.id, parseInt(v))
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue placeholder="Избери ден" />
                        </SelectTrigger>
                        <SelectContent>
                          {dayNames.map((name, idx) => (
                            <SelectItem key={idx + 1} value={String(idx + 1)}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {aiResult && (
                      <div className={`ml-7 mt-1 px-2 py-1.5 rounded text-xs flex items-start gap-1.5 ${aiResult.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {aiResult.ok ? <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" /> : <XCircle className="h-3 w-3 shrink-0 mt-0.5" />}
                        <span className="flex-1 line-clamp-2">{aiResult.message}</span>
                        <button onClick={() => clearResult(task.id)} className="text-muted-foreground hover:text-foreground">&times;</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Days of week */}
      <div className="grid gap-3">
        {dayNames.map((dayName, idx) => {
          const day = idx + 1;
          const dayTasks = getTasksForDay(day);
          const stats = getDayStats(day);
          const isOpen = openDays.includes(day);
          const progress =
            stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

          return (
            <Collapsible
              key={day}
              open={isOpen}
              onOpenChange={() => toggleDay(day)}
            >
              <Card
                className={`transition-all ${
                  isOpen ? "ring-1 ring-primary/20" : ""
                }`}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {day}
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium">
                            {dayName}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {stats.completed}/{stats.total} завършени
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {stats.total > 0 && (
                          <div className="w-24">
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    {dayTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Няма задачи за този ден
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {dayTasks.map((task) => {
                          const running = isRunning(task.id);
                          const aiResult = results[task.id];
                          return (
                            <div key={task.id}>
                              <div
                                className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-all group ${running ? "opacity-70" : ""}`}
                              >
                                <button
                                  disabled={running}
                                  onClick={async () => {
                                    if (task.status === "done") {
                                      onToggleComplete(task.id, "todo");
                                      return;
                                    }
                                    const result = await execute(task.id, task.title);
                                    if (result.ok) onToggleComplete(task.id, "done");
                                  }}
                                  className="shrink-0"
                                >
                                  {running ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  ) : task.status === "done" ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  ) : (
                                    <Play className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-medium ${
                                        task.status === "done"
                                          ? "line-through text-muted-foreground"
                                          : ""
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className={priorityColors[task.priority]}
                                    >
                                      {task.priority === "low"
                                        ? "Нисък"
                                        : task.priority === "medium"
                                        ? "Среден"
                                        : "Висок"}
                                    </Badge>
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {task.description}
                                    </p>
                                  )}
                                  {task.assignee_name && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {task.assignee_name}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Select
                                    value={String(task.day_of_week)}
                                    onValueChange={(v) =>
                                      onUpdateTaskDay(
                                        task.id,
                                        v === "none" ? null : parseInt(v)
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-[120px] h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        Премахни ден
                                      </SelectItem>
                                      {dayNames.map((name, i) => (
                                        <SelectItem key={i + 1} value={String(i + 1)}>
                                          {name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => onDeleteTask(task.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {aiResult && (
                                <div className={`ml-7 mt-1 px-2 py-1.5 rounded text-xs flex items-start gap-1.5 ${aiResult.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                  {aiResult.ok ? <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" /> : <XCircle className="h-3 w-3 shrink-0 mt-0.5" />}
                                  <span className="flex-1 line-clamp-2">{aiResult.message}</span>
                                  <button onClick={() => clearResult(task.id)} className="text-muted-foreground hover:text-foreground">&times;</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
