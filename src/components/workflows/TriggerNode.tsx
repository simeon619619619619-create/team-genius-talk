import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowEventStatus } from "@/types/workflow";

const statusColors: Record<WorkflowEventStatus, string> = {
  pending: "border-muted-foreground/30 bg-muted/50",
  running: "border-blue-500 bg-blue-500/10 animate-pulse",
  done: "border-green-500 bg-green-500/10",
  error: "border-red-500 bg-red-500/10",
  skipped: "border-muted-foreground/20 bg-muted/30 opacity-50",
};

interface TriggerNodeProps {
  data: { label: string; eventStatus?: WorkflowEventStatus };
}

export function TriggerNode({ data }: TriggerNodeProps) {
  const colorClass = data.eventStatus ? statusColors[data.eventStatus] : "border-green-500 bg-green-500/10";
  return (
    <div className={cn("flex items-center gap-2 rounded-full px-4 py-2 border-2", colorClass)}>
      <Play className="h-4 w-4 text-green-500" />
      <span className="text-sm font-medium">{data.label || "Старт"}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-2 !h-2" />
    </div>
  );
}
