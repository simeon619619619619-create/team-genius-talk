import { Handle, Position } from "@xyflow/react";
import { CircleStop } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowEventStatus } from "@/types/workflow";

const statusColors: Record<WorkflowEventStatus, string> = {
  pending: "border-muted-foreground/30",
  running: "border-red-500 animate-pulse",
  done: "border-green-500",
  error: "border-red-500",
  skipped: "border-muted-foreground/20 opacity-50",
};

interface EndNodeProps {
  data: { label: string; eventStatus?: WorkflowEventStatus };
}

export function EndNode({ data }: EndNodeProps) {
  const colorClass = data.eventStatus ? statusColors[data.eventStatus] : "border-red-500/50";
  return (
    <div className={cn("flex items-center gap-2 rounded-full px-4 py-2 border-2", colorClass)}>
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-2 !h-2" />
      <CircleStop className="h-4 w-4 text-red-500" />
      <span className="text-sm font-medium">{data.label || "Край"}</span>
    </div>
  );
}
