import { useState } from "react";
import { Calendar, Flag, User, ChevronDown, ChevronUp, CheckCircle2, Circle, ArrowRight, Trash2, FileText, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddSubtaskDialog } from "./AddSubtaskDialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
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
import { DbTask, DbSubtask } from "@/hooks/useTasks";

const dayNames: Record<number, string> = {
  1: "Пон",
  2: "Вто",
  3: "Сря",
  4: "Чет",
  5: "Пет",
  6: "Съб",
  7: "Нед",
};

import { ProjectTeamMember } from "@/hooks/useProjectTeamMembers";

interface TaskCardProps {
  task: DbTask;
  teamMembers: ProjectTeamMember[];
  onStatusChange: (taskId: string, status: DbTask["status"]) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (taskId: string, subtask: { title: string; assignee_name?: string; due_date?: string; handoff_to?: string }) => void;
  onSubtaskStatusChange: (taskId: string, subtaskId: string, status: DbSubtask["status"]) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const statusColors = {
  "todo": "bg-muted",
  "in-progress": "bg-primary/10 border-l-4 border-l-primary",
  "done": "bg-success/10 border-l-4 border-l-success",
};

export function TaskCard({ 
  task, 
  teamMembers,
  onStatusChange,
  onDelete,
  onAddSubtask,
  onSubtaskStatusChange,
  onDeleteSubtask,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.status === "done").length;
  const progressPercent = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const handleAddSubtask = (subtask: { title: string; assigneeId: string; dueDate?: string; handoffTo?: string }) => {
    onAddSubtask(task.id, {
      title: subtask.title,
      assignee_name: subtask.assigneeId,
      due_date: subtask.dueDate,
      handoff_to: subtask.handoffTo,
    });
  };

  return (
    <div className={cn(
      "rounded-lg p-4 transition-all duration-200 hover:shadow-md animate-fade-in",
      statusColors[task.status]
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className={cn(
            "font-medium",
            task.status === "done" && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            priorityColors[task.priority]
          )}>
            <Flag className="h-3 w-3" />
            {task.priority === "high" ? "Високо" : task.priority === "medium" ? "Средно" : "Ниско"}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Изтриване на задача</AlertDialogTitle>
                <AlertDialogDescription>
                  Сигурни ли сте, че искате да изтриете тази задача? Това действие не може да бъде отменено.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отказ</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Изтрий
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Business Plan Source Badge */}
      {task.source_weekly_task_id && task.source_week_number && (
        <div className="mt-3 flex items-center gap-2">
          <Link to="/business-plan" className="inline-flex items-center gap-1.5">
            <Badge variant="secondary" className="gap-1 hover:bg-secondary/80 cursor-pointer">
              <FileText className="h-3 w-3" />
              Бизнес план
            </Badge>
          </Link>
          <Badge variant="outline" className="gap-1">
            <CalendarDays className="h-3 w-3" />
            Седмица {task.source_week_number}
            {task.day_of_week && `, ${dayNames[task.day_of_week] || "Ден " + task.day_of_week}`}
          </Badge>
        </div>
      )}

      {/* Subtasks Progress */}
      {subtasks.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Подзадачи: {completedSubtasks}/{subtasks.length}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {task.assignee_name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{task.assignee_name}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(task.due_date).toLocaleDateString("bg-BG")}</span>
            </div>
          )}
        </div>

        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as DbTask["status"])}
          className="text-sm bg-transparent border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="todo">За изпълнение</option>
          <option value="in-progress">В процес</option>
          <option value="done">Завършено</option>
        </select>
      </div>

      {/* Subtasks Section */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {subtasks.length > 0 ? `${subtasks.length} подзадач${subtasks.length === 1 ? 'а' : 'и'}` : 'Няма подзадачи'}
          </button>
          <AddSubtaskDialog teamMembers={teamMembers} onAddSubtask={handleAddSubtask} />
        </div>

        {expanded && subtasks.length > 0 && (
          <div className="mt-3 space-y-2">
            {subtasks.map((subtask) => (
              <div 
                key={subtask.id} 
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md text-sm",
                  subtask.status === "done" ? "bg-success/5" : "bg-background/50"
                )}
              >
                <button
                  onClick={() => onSubtaskStatusChange(
                    task.id, 
                    subtask.id, 
                    subtask.status === "done" ? "todo" : "done"
                  )}
                  className="mt-0.5 flex-shrink-0"
                >
                  {subtask.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    subtask.status === "done" && "line-through text-muted-foreground"
                  )}>
                    {subtask.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    {subtask.assignee_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {subtask.assignee_name}
                      </span>
                    )}
                    {subtask.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(subtask.due_date).toLocaleDateString("bg-BG")}
                      </span>
                    )}
                    {subtask.handoff_to && (
                      <span className="flex items-center gap-1 text-primary">
                        <ArrowRight className="h-3 w-3" />
                        {subtask.handoff_to}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteSubtask(task.id, subtask.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
