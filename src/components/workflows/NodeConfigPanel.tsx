import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BOT_REGISTRY } from "@/types/workflow";
import type { BotId, MindMapNodeData } from "@/types/workflow";

interface NodeConfigPanelProps {
  nodeId: string;
  data: MindMapNodeData;
  onUpdate: (nodeId: string, data: Partial<MindMapNodeData>) => void;
}

export function NodeConfigPanel({ nodeId, data, onUpdate }: NodeConfigPanelProps) {
  return (
    <div className="space-y-4 p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Настройки на стъпка
      </p>

      <div className="space-y-1.5">
        <Label>Име</Label>
        <Input
          value={data.label}
          onChange={(e) => onUpdate(nodeId, { label: e.target.value })}
          placeholder="Име на стъпката"
        />
      </div>

      {(data.type === "ai_task" || data.type === "action") && (
        <div className="space-y-1.5">
          <Label>Бот</Label>
          <Select
            value={data.botId || ""}
            onValueChange={(v) => onUpdate(nodeId, { botId: v as BotId })}
          >
            <SelectTrigger><SelectValue placeholder="Избери бот" /></SelectTrigger>
            <SelectContent>
              {Object.values(BOT_REGISTRY).filter(b => b.id !== "simeon").map((bot) => (
                <SelectItem key={bot.id} value={bot.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bot.color }} />
                    {bot.name} — {bot.role}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {data.type === "ai_task" && (
        <div className="space-y-1.5">
          <Label>Промпт за бота</Label>
          <Textarea
            value={data.taskPrompt}
            onChange={(e) => onUpdate(nodeId, { taskPrompt: e.target.value })}
            placeholder="Какво трябва да направи ботът..."
            rows={4}
          />
        </div>
      )}

      {data.type === "condition" && (
        <div className="space-y-1.5">
          <Label>Условие</Label>
          <Textarea
            value={(data.config?.expression as string) || ""}
            onChange={(e) => onUpdate(nodeId, { config: { ...data.config, expression: e.target.value } })}
            placeholder="Описание на условието (напр. 'ако open rate > 20%')"
            rows={3}
          />
        </div>
      )}

      {data.type === "delay" && (
        <div className="space-y-1.5">
          <Label>Изчакай (минути)</Label>
          <Input
            type="number"
            value={(data.config?.delayMinutes as number) || 0}
            onChange={(e) => onUpdate(nodeId, { config: { ...data.config, delayMinutes: parseInt(e.target.value) || 0 } })}
            min={0}
          />
        </div>
      )}

      {data.type === "trigger" && (
        <div className="space-y-1.5">
          <Label>Тип тригер</Label>
          <Select
            value={(data.config?.triggerType as string) || "manual"}
            onValueChange={(v) => onUpdate(nodeId, { config: { ...data.config, triggerType: v } })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Ръчно</SelectItem>
              <SelectItem value="cron">По график</SelectItem>
              <SelectItem value="event">При събитие</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
