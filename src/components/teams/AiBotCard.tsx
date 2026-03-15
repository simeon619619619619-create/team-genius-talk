import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AiBot } from "./VirtualOffice";

interface Props {
  bot: AiBot;
  onEdit: (bot: AiBot) => void;
  onDelete: (id: string) => void;
}

export function AiBotCard({ bot, onEdit, onDelete }: Props) {
  return (
    <div className="glass-card rounded-xl overflow-hidden group transition-all hover:shadow-lg hover:border-purple-300">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ background: bot.shirtColor + "22", color: bot.shirtColor }}
        >
          ★
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{bot.name}</div>
          <div className="text-xs text-muted-foreground truncate">{bot.role}</div>
        </div>
        <Badge
          variant={bot.state === "working" ? "default" : "secondary"}
          className={
            bot.state === "working"
              ? "bg-emerald-100 text-emerald-800 text-[10px]"
              : "bg-yellow-100 text-yellow-800 text-[10px]"
          }
        >
          {bot.state === "working" ? "Работи" : "Чака"}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Процес
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">
              {bot.process}
            </Badge>
            <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">
              {bot.frequency || "При нужда"}
            </Badge>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Автоматизации
          </div>
          <div className="flex flex-wrap gap-1">
            {bot.automations.map((a) => (
              <Badge key={a} variant="outline" className="text-[11px] bg-purple-50 text-purple-700 border-purple-200">
                {a}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Задачи
          </div>
          <ul className="space-y-0.5">
            {bot.tasks.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-1 p-2 border-t border-border/50">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(bot)}>
          <Pencil className="h-3 w-3" /> Редактирай
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-destructive hover:text-destructive gap-1"
          onClick={() => onDelete(bot.id)}
        >
          <Trash2 className="h-3 w-3" /> Изтрий
        </Button>
      </div>
    </div>
  );
}
