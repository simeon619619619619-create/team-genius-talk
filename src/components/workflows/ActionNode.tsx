import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowEventStatus } from "@/types/workflow";

const statusColors: Record<WorkflowEventStatus, string> = {
  pending: "border-muted-foreground/30",
  running: "border-purple-500 animate-pulse",
  done: "border-green-500",
  error: "border-red-500",
  skipped: "border-muted-foreground/20 opacity-50",
};

interface ActionNodeProps {
  data: { label: string; eventStatus?: WorkflowEventStatus };
}

export function ActionNode({ data }: ActionNodeProps) {
  const colorClass = data.eventStatus ? statusColors[data.eventStatus] : "border-purple-500/50";
  return (
    <div className={cn("rounded-xl border-2 bg-card px-4 py-2 flex items-center gap-2", colorClass)}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-2 !h-2" />
      <Zap className="h-4 w-4 text-purple-500" />
      <span className="text-sm font-medium">{data.label || "Действие"}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-2 !h-2" />
    </div>
  );
}
