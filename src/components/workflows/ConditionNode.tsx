import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowEventStatus } from "@/types/workflow";

const statusColors: Record<WorkflowEventStatus, string> = {
  pending: "border-muted-foreground/30",
  running: "border-yellow-500 animate-pulse",
  done: "border-green-500",
  error: "border-red-500",
  skipped: "border-muted-foreground/20 opacity-50",
};

interface ConditionNodeProps {
  data: { label: string; eventStatus?: WorkflowEventStatus };
}

export function ConditionNode({ data }: ConditionNodeProps) {
  const colorClass = data.eventStatus ? statusColors[data.eventStatus] : "border-yellow-500/50";
  return (
    <div className={cn("rotate-45 border-2 bg-card w-24 h-24 flex items-center justify-center", colorClass)}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-2 !h-2" />
      <div className="-rotate-45 text-center">
        <GitBranch className="h-4 w-4 text-yellow-500 mx-auto" />
        <p className="text-xs font-medium mt-1">{data.label || "Условие"}</p>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-green-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="no" className="!bg-red-500 !w-2 !h-2" />
    </div>
  );
}
