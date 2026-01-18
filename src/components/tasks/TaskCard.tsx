import { Calendar, Flag, User } from "lucide-react";
import { Task, TeamMember } from "@/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  assignee?: TeamMember;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
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

export function TaskCard({ task, assignee, onStatusChange }: TaskCardProps) {
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
    </div>
  );
}
