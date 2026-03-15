import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight, Play, Loader2, CheckCircle2, Clock, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { AiBot, AiBotTaskGroup, AiBotSubtask } from "./VirtualOffice";

interface Props {
  bot: AiBot;
  onEdit: (bot: AiBot) => void;
  onDelete: (id: string) => void;
  onUpdate: (bot: AiBot) => void;
}

export function AiBotCard({ bot, onEdit, onDelete, onUpdate }: Props) {
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    (bot.taskGroups || []).forEach(g => { init[g.id] = true; });
    return init;
  });
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const processingRef = useRef(false);
  const botRef = useRef(bot);
  botRef.current = bot;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Queue a subtask for execution
  const queueSubtask = (groupId: string, subtaskId: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        subtasks: g.subtasks.map(s =>
          s.id === subtaskId && (!s.status || s.status === "idle")
            ? { ...s, status: "queued" as const }
            : s
        ),
      };
    });
    const updated = { ...bot, taskGroups: groups };
    onUpdate(updated);
  };

  // Cancel a queued subtask
  const cancelSubtask = (groupId: string, subtaskId: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        subtasks: g.subtasks.map(s =>
          s.id === subtaskId && s.status === "queued"
            ? { ...s, status: "idle" as const }
            : s
        ),
      };
    });
    onUpdate({ ...bot, taskGroups: groups });
  };

  // Reset a done task back to idle
  const resetSubtask = (groupId: string, subtaskId: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        subtasks: g.subtasks.map(s =>
          s.id === subtaskId
            ? { ...s, status: "idle" as const, done: false, result: undefined }
            : s
        ),
      };
    });
    onUpdate({ ...bot, taskGroups: groups });
  };

  // Process queue - find next queued task and execute it
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;

    const currentBot = botRef.current;
    let nextTask: { groupId: string; subtask: AiBotSubtask } | null = null;

    for (const g of currentBot.taskGroups || []) {
      for (const s of g.subtasks) {
        if (s.status === "queued") {
          nextTask = { groupId: g.id, subtask: s };
          break;
        }
      }
      if (nextTask) break;
    }

    if (!nextTask) {
      // No more queued tasks — set bot to idle
      if (currentBot.state === "working") {
        onUpdate({ ...currentBot, state: "idle" });
      }
      return;
    }

    processingRef.current = true;
    const { groupId, subtask } = nextTask;

    // Mark as running + bot as working
    const runningGroups = (currentBot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        subtasks: g.subtasks.map(s =>
          s.id === subtask.id ? { ...s, status: "running" as const } : s
        ),
      };
    });
    onUpdate({ ...currentBot, taskGroups: runningGroups, state: "working" });

    try {
      // Call AI to execute the task
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `Ти си ${currentBot.name}, ${currentBot.role}. Твоят процес е: ${currentBot.process}. Изпълни тази задача и дай кратък резултат (макс 3 изречения):\n\n"${subtask.text}"`,
            },
          ],
          context: "business",
        },
      });

      const result = error
        ? "Грешка при изпълнение"
        : data?.content || "Задачата е изпълнена.";

      // Mark as done with result
      const freshBot = botRef.current;
      const doneGroups = (freshBot.taskGroups || []).map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          subtasks: g.subtasks.map(s =>
            s.id === subtask.id
              ? { ...s, status: "done" as const, done: true, result }
              : s
          ),
        };
      });
      onUpdate({ ...freshBot, taskGroups: doneGroups });

      toast.success(`${currentBot.name} завърши: "${subtask.text.substring(0, 40)}..."`, {
        duration: 5000,
      });
    } catch (err) {
      // Mark as done with error
      const freshBot = botRef.current;
      const errGroups = (freshBot.taskGroups || []).map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          subtasks: g.subtasks.map(s =>
            s.id === subtask.id
              ? { ...s, status: "done" as const, done: true, result: "Грешка при изпълнение на задачата." }
              : s
          ),
        };
      });
      onUpdate({ ...freshBot, taskGroups: errGroups });
    } finally {
      processingRef.current = false;
    }
  }, [onUpdate]);

  // Watch for queued tasks and process them
  useEffect(() => {
    const hasQueued = (bot.taskGroups || []).some(g =>
      g.subtasks.some(s => s.status === "queued")
    );
    const hasRunning = (bot.taskGroups || []).some(g =>
      g.subtasks.some(s => s.status === "running")
    );

    if (hasQueued && !hasRunning && !processingRef.current) {
      processQueue();
    }
  }, [bot.taskGroups, processQueue]);

  const addGroup = () => {
    if (!newGroupTitle.trim()) return;
    const group: AiBotTaskGroup = {
      id: "tg-" + Date.now(),
      title: newGroupTitle.trim(),
      subtasks: [],
    };
    onUpdate({ ...bot, taskGroups: [...(bot.taskGroups || []), group] });
    setNewGroupTitle("");
    setAddingGroup(false);
    setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
  };

  const addSubtask = (groupId: string) => {
    const text = (newSubtaskTexts[groupId] || "").trim();
    if (!text) return;
    const subtask: AiBotSubtask = { id: "st-" + Date.now(), text, done: false, status: "idle" };
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return { ...g, subtasks: [...g.subtasks, subtask] };
    });
    onUpdate({ ...bot, taskGroups: groups });
    setNewSubtaskTexts(prev => ({ ...prev, [groupId]: "" }));
  };

  const deleteGroup = (groupId: string) => {
    onUpdate({ ...bot, taskGroups: (bot.taskGroups || []).filter(g => g.id !== groupId) });
  };

  const deleteSubtask = (groupId: string, subtaskId: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return { ...g, subtasks: g.subtasks.filter(s => s.id !== subtaskId) };
    });
    onUpdate({ ...bot, taskGroups: groups });
  };

  // Queue all idle subtasks in a group
  const queueAllInGroup = (groupId: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        subtasks: g.subtasks.map(s =>
          (!s.status || s.status === "idle") ? { ...s, status: "queued" as const } : s
        ),
      };
    });
    onUpdate({ ...bot, taskGroups: groups });
    toast.info(`Всички задачи от групата са добавени в опашката на ${bot.name}`);
  };

  const queuedCount = (bot.taskGroups || []).reduce((acc, g) =>
    acc + g.subtasks.filter(s => s.status === "queued").length, 0
  );
  const runningCount = (bot.taskGroups || []).reduce((acc, g) =>
    acc + g.subtasks.filter(s => s.status === "running").length, 0
  );

  return (
    <div className={cn(
      "glass-card rounded-xl overflow-hidden group transition-all hover:shadow-lg",
      bot.state === "working" ? "border-emerald-300 dark:border-emerald-700 shadow-emerald-100 dark:shadow-emerald-900/20" : "hover:border-purple-300"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 relative"
          style={{ background: bot.shirtColor + "22", color: bot.shirtColor }}
        >
          ★
          {bot.state === "working" && (
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
              <span className="relative block h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{bot.name}</div>
          <div className="text-xs text-muted-foreground truncate">{bot.role}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {queuedCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
              <Clock className="h-2.5 w-2.5 mr-0.5" />{queuedCount}
            </Badge>
          )}
          <Badge
            variant={bot.state === "working" ? "default" : "secondary"}
            className={
              bot.state === "working"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-[10px]"
            }
          >
            {bot.state === "working" ? "Работи" : "Чака"}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Process & Frequency */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Процес</div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">{bot.process}</Badge>
            <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300">{bot.frequency || "При нужда"}</Badge>
          </div>
        </div>

        {/* Automations */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Автоматизации</div>
          <div className="flex flex-wrap gap-1">
            {bot.automations.map((a) => (
              <Badge key={a} variant="outline" className="text-[11px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300">{a}</Badge>
            ))}
          </div>
        </div>

        {/* Skills */}
        {bot.skills && bot.skills.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Умения
            </div>
            <div className="flex flex-wrap gap-1">
              {bot.skills.map((s) => (
                <Badge key={s} variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Task Groups */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Задачи</div>

          <div className="space-y-2">
            {(bot.taskGroups || []).map((group, gi) => {
              const done = group.subtasks.filter(s => s.status === "done" || s.done).length;
              const total = group.subtasks.length;
              const pct = total > 0 ? (done / total) * 100 : 0;
              const expanded = expandedGroups[group.id] !== false;
              const hasIdleTasks = group.subtasks.some(s => !s.status || s.status === "idle");

              return (
                <div key={group.id} className="rounded-lg border border-border/60 bg-secondary/20 overflow-hidden">
                  {/* Group Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/40 transition-colors"
                    onClick={() => toggleGroup(group.id)}
                  >
                    {expanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    }
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{gi + 1}</span>
                    <span className="text-xs font-semibold truncate flex-1">{group.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasIdleTasks && (
                        <button
                          className="text-primary/60 hover:text-primary transition-colors p-0.5"
                          onClick={(e) => { e.stopPropagation(); queueAllInGroup(group.id); }}
                          title="Изпълни всички"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className="w-12 h-1.5 bg-border/50 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{done}/{total}</span>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Subtasks */}
                  {expanded && (
                    <div className="px-3 pb-2 space-y-1">
                      {group.subtasks.map((st) => {
                        const status = st.status || "idle";
                        const showResult = expandedResults[st.id];

                        return (
                          <div key={st.id} className="group/st">
                            <div className="flex items-center gap-2">
                              {/* Status indicator + action */}
                              {status === "idle" && (
                                <button
                                  className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10 flex items-center justify-center shrink-0 transition-all"
                                  onClick={() => queueSubtask(group.id, st.id)}
                                  title="Изпълни задачата"
                                >
                                  <Play className="h-2.5 w-2.5 text-muted-foreground/50 group-hover/st:text-primary" />
                                </button>
                              )}
                              {status === "queued" && (
                                <button
                                  className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0"
                                  onClick={() => cancelSubtask(group.id, st.id)}
                                  title="Отмени"
                                >
                                  <Clock className="h-2.5 w-2.5 text-amber-600" />
                                </button>
                              )}
                              {status === "running" && (
                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                  <Loader2 className="h-3 w-3 text-emerald-600 animate-spin" />
                                </div>
                              )}
                              {status === "done" && (
                                <button
                                  className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                                  onClick={() => resetSubtask(group.id, st.id)}
                                  title="Рестартирай"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                </button>
                              )}

                              <span className={cn(
                                "text-xs flex-1",
                                status === "done" && "text-muted-foreground/60",
                                status === "running" && "text-emerald-700 dark:text-emerald-300 font-medium",
                                status === "queued" && "text-amber-700 dark:text-amber-300",
                              )}>
                                {st.text}
                              </span>

                              <div className="flex items-center gap-0.5 shrink-0">
                                {status === "done" && st.result && (
                                  <button
                                    className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                                    onClick={() => setExpandedResults(prev => ({ ...prev, [st.id]: !prev[st.id] }))}
                                    title={showResult ? "Скрий резултат" : "Виж резултат"}
                                  >
                                    {showResult ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                )}
                                {(status === "idle" || status === "done") && (
                                  <button
                                    className="opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                                    onClick={() => deleteSubtask(group.id, st.id)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Result panel */}
                            {status === "done" && st.result && showResult && (
                              <div className="ml-7 mt-1 mb-1 p-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-foreground/80 leading-relaxed">
                                {st.result}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add subtask inline */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Input
                          className="h-6 text-xs bg-transparent border-0 border-b border-border/30 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary/50 placeholder:text-muted-foreground/40"
                          placeholder="Добави действие..."
                          value={newSubtaskTexts[group.id] || ""}
                          onChange={(e) => setNewSubtaskTexts(prev => ({ ...prev, [group.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(group.id); } }}
                        />
                        <button className="text-primary/50 hover:text-primary transition-colors shrink-0" onClick={() => addSubtask(group.id)}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new task group */}
          {addingGroup ? (
            <div className="flex items-center gap-1.5 mt-2">
              <Input
                className="h-7 text-xs"
                placeholder="Име на задачата..."
                value={newGroupTitle}
                onChange={(e) => setNewGroupTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGroup(); } }}
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs px-2" onClick={addGroup}>+</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setAddingGroup(false); setNewGroupTitle(""); }}>✕</Button>
            </div>
          ) : (
            <button className="text-xs text-primary/60 hover:text-primary mt-1.5 transition-colors" onClick={() => setAddingGroup(true)}>
              + Добави задача...
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1 p-2 border-t border-border/50">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(bot)}>
          <Pencil className="h-3 w-3" /> Редактирай
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1" onClick={() => onDelete(bot.id)}>
          <Trash2 className="h-3 w-3" /> Изтрий
        </Button>
      </div>
    </div>
  );
}
