import { Handle, Position } from "@xyflow/react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowEventStatus } from "@/types/workflow";

const statusColors: Record<WorkflowEventStatus, string> = {
  pending: "border-muted-foreground/30",
  running: "border-gray-500 animate-pulse",
  done: "border-green-500",
  error: "border-red-500",
  skipped: "border-muted-foreground/20 opacity-50",
};

interface DelayNodeProps {
  data: { label: string; config: { delayMinutes?: number }; eventStatus?: WorkflowEventStatus };
}

export function DelayNode({ data }: DelayNodeProps) {
  const colorClass = data.eventStatus ? statusColors[data.eventStatus] : "border-gray-400/50";
  const mins = data.config?.delayMinutes || 0;
  const display = mins >= 60 ? `${Math.floor(mins / 60)}ч ${mins % 60}м` : `${mins}м`;
  return (
    <div className={cn("rounded-xl border-2 bg-card px-4 py-2 flex items-center gap-2", colorClass)}>
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
      <Clock className="h-4 w-4 text-gray-400" />
      <div>
        <p className="text-sm font-medium">{data.label || "Изчакай"}</p>
        <p className="text-xs text-muted-foreground">{display}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
    </div>
  );
}
