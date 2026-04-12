import { Play, Bot, GitBranch, Clock, ShieldCheck, Zap, CircleStop } from "lucide-react";
import type { WorkflowNodeType } from "@/types/workflow";

interface PaletteItem {
  type: WorkflowNodeType;
  label: string;
  icon: typeof Play;
  color: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: "trigger", label: "Тригер", icon: Play, color: "text-green-500" },
  { type: "ai_task", label: "AI Задача", icon: Bot, color: "text-blue-500" },
  { type: "condition", label: "Условие", icon: GitBranch, color: "text-yellow-500" },
  { type: "delay", label: "Изчакай", icon: Clock, color: "text-gray-400" },
  { type: "human_approval", label: "Одобрение", icon: ShieldCheck, color: "text-orange-500" },
  { type: "action", label: "Действие", icon: Zap, color: "text-purple-500" },
  { type: "end", label: "Край", icon: CircleStop, color: "text-red-500" },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData("application/reactflow-nodetype", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        Елементи
      </p>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => onDragStart(e, item.type)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/30 cursor-grab hover:border-primary/50 hover:bg-accent/50 transition-colors"
        >
          <item.icon className={`h-4 w-4 ${item.color}`} />
          <span className="text-sm">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
