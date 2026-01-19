import { useState } from "react";
import { Calendar, Flag, User, ChevronDown, ChevronUp, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Task, TeamMember, Subtask } from "@/types";
import { cn } from "@/lib/utils";
import { AddSubtaskDialog } from "./AddSubtaskDialog";
import { Progress } from "@/components/ui/progress";

interface TaskCardProps {
  task: Task;
  assignee?: TeamMember;
  members: TeamMember[];
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onAddSubtask: (taskId: string, subtask: Omit<Subtask, "id">) => void;
  onSubtaskStatusChange: (taskId: string, subtaskId: string, status: Subtask["status"]) => void;
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
  assignee, 
  members,
  onStatusChange, 
  onAddSubtask,
  onSubtaskStatusChange 
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.status === "done").length;
  const progressPercent = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const handleAddSubtask = (subtask: Omit<Subtask, "id">) => {
    onAddSubtask(task.id, subtask);
  };

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || "Неизвестен";
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
        <span className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          priorityColors[task.priority]
        )}>
          <Flag className="h-3 w-3" />
          {task.priority === "high" ? "Високо" : task.priority === "medium" ? "Средно" : "Ниско"}
        </span>
      </div>

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
          {assignee && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{assignee.name}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(task.dueDate).toLocaleDateString("bg-BG")}</span>
            </div>
          )}
        </div>

        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as Task["status"])}
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
          <AddSubtaskDialog members={members} onAddSubtask={handleAddSubtask} />
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
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {getMemberName(subtask.assigneeId)}
                    </span>
                    {subtask.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(subtask.dueDate).toLocaleDateString("bg-BG")}
                      </span>
                    )}
                    {subtask.handoffTo && (
                      <span className="flex items-center gap-1 text-primary">
                        <ArrowRight className="h-3 w-3" />
                        {getMemberName(subtask.handoffTo)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
