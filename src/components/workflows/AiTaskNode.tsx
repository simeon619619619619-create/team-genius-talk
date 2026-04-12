import { Handle, Position } from "@xyflow/react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOT_REGISTRY } from "@/types/workflow";
import type { BotId, WorkflowEventStatus } from "@/types/workflow";

const statusColors: Record<WorkflowEventStatus, string> = {
  pending: "border-muted-foreground/30",
  running: "border-blue-500 shadow-lg shadow-blue-500/20 animate-pulse",
  done: "border-green-500",
  error: "border-red-500",
  skipped: "border-muted-foreground/20 opacity-50",
};

interface AiTaskNodeProps {
  data: { label: string; botId: BotId | null; eventStatus?: WorkflowEventStatus };
}

export function AiTaskNode({ data }: AiTaskNodeProps) {
  const bot = data.botId ? BOT_REGISTRY[data.botId] : null;
  const colorClass = data.eventStatus ? statusColors[data.eventStatus] : "border-blue-500/50";
  return (
    <div className={cn("rounded-xl border-2 bg-card px-4 py-3 min-w-[180px]", colorClass)}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <div className="rounded-full p-1.5" style={{ backgroundColor: bot ? `${bot.color}20` : undefined }}>
          <Bot className="h-4 w-4" style={{ color: bot?.color || "#60a5fa" }} />
        </div>
        <div>
          <p className="text-sm font-medium">{data.label}</p>
          {bot && <p className="text-xs text-muted-foreground">{bot.name}</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-2 !h-2" />
    </div>
  );
}
