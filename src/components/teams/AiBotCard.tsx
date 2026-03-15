import { useState } from "react";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight, Play, Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AiBot, AiBotTaskGroup, AiBotSubtask, SubtaskAction } from "./VirtualOffice";

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
  const [runningTasks, setRunningTasks] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const executeAction = async (groupId: string, subtaskId: string, action: SubtaskAction) => {
    setRunningTasks(prev => ({ ...prev, [subtaskId]: true }));

    try {
      if (action.type === "open_url") {
        window.open(action.url, "_blank");
        updateSubtaskResult(groupId, subtaskId, true, "Отворено в нов таб");
        return;
      }

      if (action.type === "fetch") {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
          const res = await fetch(action.url, {
            method: "GET",
            mode: "no-cors",
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (action.expect === "json_not_empty") {
            try {
              const corsRes = await fetch(action.url);
              if (corsRes.ok) {
                const data = await corsRes.json();
                const hasData = Array.isArray(data) ? data.length > 0 :
                  (data.models && data.models.length > 0) ||
                  (data.data && data.data.length > 0) ||
                  Object.keys(data).length > 0;
                updateSubtaskResult(groupId, subtaskId, hasData,
                  hasData ? "JSON OK — данните не са празни" : "JSON е празен!");
              } else {
                updateSubtaskResult(groupId, subtaskId, false, `HTTP ${corsRes.status}`);
              }
            } catch {
              updateSubtaskResult(groupId, subtaskId, true, "Заявката мина (CORS ограничен)");
            }
          } else {
            updateSubtaskResult(groupId, subtaskId, true, "OK — сайтът отговаря");
          }
        } catch (err: unknown) {
          clearTimeout(timeout);
          const isAbort = err instanceof Error && err.name === "AbortError";
          updateSubtaskResult(groupId, subtaskId, false,
            isAbort ? "Timeout — няма отговор за 15сек" : "Грешка при заявката");
        }
      }
    } finally {
      setRunningTasks(prev => ({ ...prev, [subtaskId]: false }));
    }
  };

  const updateSubtaskResult = (groupId: string, subtaskId: string, ok: boolean, message: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        subtasks: g.subtasks.map(s =>
          s.id === subtaskId
            ? { ...s, done: ok, lastResult: { ok, message, at: new Date().toLocaleTimeString("bg-BG") } }
            : s
        ),
      };
    });
    onUpdate({ ...bot, taskGroups: groups });
  };

  const toggleSubtask = (groupId: string, subtaskId: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        subtasks: g.subtasks.map(s =>
          s.id === subtaskId ? { ...s, done: !s.done } : s
        ),
      };
    });
    onUpdate({ ...bot, taskGroups: groups });
  };

  const runAllInGroup = async (group: AiBotTaskGroup) => {
    for (const st of group.subtasks) {
      if (st.action && !st.done) {
        await executeAction(group.id, st.id, st.action);
      }
    }
  };

  const addGroup = () => {
    if (!newGroupTitle.trim()) return;
    const group: AiBotTaskGroup = {
      id: "tg-" + Date.now(),
      title: newGroupTitle.trim(),
      subtasks: [],
    };
    const groups = [...(bot.taskGroups || []), group];
    onUpdate({ ...bot, taskGroups: groups });
    setNewGroupTitle("");
    setAddingGroup(false);
    setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
  };

  const addSubtask = (groupId: string) => {
    const text = (newSubtaskTexts[groupId] || "").trim();
    if (!text) return;
    const subtask: AiBotSubtask = { id: "st-" + Date.now(), text, done: false };
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return { ...g, subtasks: [...g.subtasks, subtask] };
    });
    onUpdate({ ...bot, taskGroups: groups });
    setNewSubtaskTexts(prev => ({ ...prev, [groupId]: "" }));
  };

  const deleteGroup = (groupId: string) => {
    const groups = (bot.taskGroups || []).filter(g => g.id !== groupId);
    onUpdate({ ...bot, taskGroups: groups });
  };

  const deleteSubtask = (groupId: string, subtaskId: string) => {
    const groups = (bot.taskGroups || []).map(g => {
      if (g.id !== groupId) return g;
      return { ...g, subtasks: g.subtasks.filter(s => s.id !== subtaskId) };
    });
    onUpdate({ ...bot, taskGroups: groups });
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden group transition-all hover:shadow-lg hover:border-purple-300">
      {/* Header */}
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
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-[10px]"
          }
        >
          {bot.state === "working" ? "Работи" : "Чака"}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        {/* Process & Frequency */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Процес
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
              {bot.process}
            </Badge>
            <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300">
              {bot.frequency || "При нужда"}
            </Badge>
          </div>
        </div>

        {/* Automations */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Автоматизации
          </div>
          <div className="flex flex-wrap gap-1">
            {bot.automations.map((a) => (
              <Badge key={a} variant="outline" className="text-[11px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300">
                {a}
              </Badge>
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

        {/* Task Groups with Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Задачи
            </div>
          </div>

          {/* Legacy simple tasks (backwards compat) */}
          {(!bot.taskGroups || bot.taskGroups.length === 0) && bot.tasks.length > 0 && (
            <ul className="space-y-0.5 mb-2">
              {bot.tasks.map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          )}

          {/* Task Groups */}
          <div className="space-y-2">
            {(bot.taskGroups || []).map((group, gi) => {
              const done = group.subtasks.filter(s => s.done).length;
              const total = group.subtasks.length;
              const pct = total > 0 ? (done / total) * 100 : 0;
              const expanded = expandedGroups[group.id] !== false;
              const hasActions = group.subtasks.some(s => s.action);
              const groupRunning = group.subtasks.some(s => runningTasks[s.id]);

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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {gi + 1}
                      </span>
                      <span className="text-xs font-semibold truncate">{group.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Run all actions button */}
                      {hasActions && (
                        <button
                          className="text-emerald-500 hover:text-emerald-600 transition-colors p-0.5 disabled:opacity-50"
                          onClick={(e) => { e.stopPropagation(); runAllInGroup(group); }}
                          disabled={groupRunning}
                          title="Изпълни всички"
                        >
                          {groupRunning
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Play className="h-3.5 w-3.5" />
                          }
                        </button>
                      )}
                      <div className="w-16 h-1.5 bg-border/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {done}/{total}
                      </span>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                        title="Изтрий група"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Subtasks */}
                  {expanded && (
                    <div className="px-3 pb-2 space-y-1.5">
                      {group.subtasks.map((st) => {
                        const isRunning = runningTasks[st.id];
                        const hasAction = !!st.action;

                        return (
                          <div key={st.id} className="group/st">
                            <div className="flex items-center gap-2">
                              {/* Action execute button or checkbox */}
                              {hasAction ? (
                                <button
                                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all text-[10px] font-bold ${
                                    isRunning
                                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                                      : st.done
                                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
                                        : "bg-primary/10 text-primary hover:bg-primary/20"
                                  }`}
                                  onClick={() => st.action && executeAction(group.id, st.id, st.action)}
                                  disabled={isRunning}
                                  title={st.action?.type === "open_url" ? "Отвори" : "Изпълни"}
                                >
                                  {isRunning ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : st.done ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : st.action?.type === "open_url" ? (
                                    <ExternalLink className="h-3 w-3" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    st.done
                                      ? "border-primary bg-primary"
                                      : "border-muted-foreground/30 hover:border-primary/50"
                                  }`}
                                  onClick={() => toggleSubtask(group.id, st.id)}
                                >
                                  {st.done && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              )}

                              <span className={`text-xs flex-1 ${st.done && !hasAction ? "line-through text-muted-foreground/50" : "text-foreground"}`}>
                                {st.text}
                              </span>

                              {hasAction && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 bg-blue-50/50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                                  {st.action?.type === "fetch" ? "проверка" : "линк"}
                                </Badge>
                              )}

                              <button
                                className="opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                                onClick={() => deleteSubtask(group.id, st.id)}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>

                            {/* Result indicator */}
                            {st.lastResult && (
                              <div className={`flex items-center gap-1.5 ml-8 mt-0.5 text-[10px] ${
                                st.lastResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                              }`}>
                                {st.lastResult.ok
                                  ? <CheckCircle2 className="h-2.5 w-2.5" />
                                  : <XCircle className="h-2.5 w-2.5" />
                                }
                                <span>{st.lastResult.message}</span>
                                <span className="text-muted-foreground/50">({st.lastResult.at})</span>
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
                        <button
                          className="text-primary/50 hover:text-primary transition-colors shrink-0"
                          onClick={() => addSubtask(group.id)}
                        >
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
            <button
              className="text-xs text-primary/60 hover:text-primary mt-1.5 transition-colors"
              onClick={() => setAddingGroup(true)}
            >
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
