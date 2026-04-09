import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Bot,
  Plus,
  Trash2,
  Pencil,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { bg } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAgents,
  type Agent,
  type AgentInput,
  type AgentRun,
  type AgentWithLastRun,
} from "@/hooks/useAgents";

const DEFAULT_INPUT: AgentInput = {
  name: "",
  description: "",
  task_prompt: "",
  schedule_cron: "0 8 * * *",
  timezone: "Europe/Sofia",
  is_active: true,
};

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: "Всеки ден в 08:00", value: "0 8 * * *" },
  { label: "Всеки ден в 09:00", value: "0 9 * * *" },
  { label: "Всеки ден в 17:00", value: "0 17 * * *" },
  { label: "На всеки час", value: "0 * * * *" },
  { label: "На всеки 15 мин", value: "*/15 * * * *" },
  { label: "Понеделник 09:00", value: "0 9 * * 1" },
  { label: "Всеки 1-ви от месеца в 09:00", value: "0 9 1 * *" },
];

function StatusBadge({ status }: { status: AgentRun["status"] | "never" }) {
  if (status === "never")
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        Не е стартиран
      </Badge>
    );
  if (status === "running")
    return (
      <Badge className="gap-1 bg-blue-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Върви
      </Badge>
    );
  if (status === "success")
    return (
      <Badge className="gap-1 bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Успех
      </Badge>
    );
  if (status === "error")
    return (
      <Badge className="gap-1 bg-red-600">
        <XCircle className="h-3 w-3" />
        Грешка
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: bg });
  } catch {
    return "—";
  }
}

export function AgentsTab() {
  const {
    agents,
    loading,
    createAgent,
    updateAgent,
    deleteAgent,
    logManualRun,
    fetchRunsForAgent,
  } = useAgents();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState<AgentInput>(DEFAULT_INPUT);
  const [historyAgent, setHistoryAgent] = useState<AgentWithLastRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<AgentRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_INPUT);
    setDialogOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name,
      description: agent.description ?? "",
      task_prompt: agent.task_prompt,
      schedule_cron: agent.schedule_cron,
      timezone: agent.timezone,
      is_active: agent.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Името е задължително");
      return;
    }
    if (!form.task_prompt.trim()) {
      toast.error("Задачата (prompt) е задължителна");
      return;
    }
    if (editing) {
      const ok = await updateAgent(editing.id, form);
      if (ok) setDialogOpen(false);
    } else {
      const created = await createAgent(form);
      if (created) setDialogOpen(false);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Изтриване на "${agent.name}"? Това действие не може да се върне.`)) return;
    await deleteAgent(agent.id);
  };

  const handleRunNow = async (agent: Agent) => {
    if (!confirm(`Маркиране на ръчно стартиране на "${agent.name}"?`)) return;
    await logManualRun(
      agent.id,
      "success",
      "Ръчно стартиране от таблото (placeholder — реалното изпълнение става през scheduled trigger или Claude Code сесия)"
    );
  };

  const openHistory = async (agent: AgentWithLastRun) => {
    setHistoryAgent(agent);
    setHistoryLoading(true);
    const runs = await fetchRunsForAgent(agent.id, 30);
    setHistoryRuns(runs);
    setHistoryLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Агенти
            </CardTitle>
            <CardDescription>
              Scheduled задачи които се изпълняват по график. Всеки run се логва автоматично.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Нов агент
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            <Bot className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="mb-4">Нямаш агенти. Създай първия си scheduled агент.</p>
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Нов агент
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Име</TableHead>
                  <TableHead>График</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Последно</TableHead>
                  <TableHead>Активен</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="font-medium">{agent.name}</div>
                      {agent.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                          {agent.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {agent.schedule_cron}
                      </code>
                      <div className="text-xs text-muted-foreground mt-1">{agent.timezone}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={agent.last_run?.status ?? "never"} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelative(agent.last_run?.started_at ?? agent.last_run_at)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={agent.is_active}
                        onCheckedChange={(v) => updateAgent(agent.id, { is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="История"
                          onClick={() => openHistory(agent)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Ръчно стартиране"
                          onClick={() => handleRunNow(agent)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Редактирай"
                          onClick={() => openEdit(agent)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Изтрий"
                          onClick={() => handleDelete(agent)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Редакция на агент" : "Нов агент"}</DialogTitle>
            <DialogDescription>
              Агентът е задача която се изпълнява по график. Prompt-ът описва какво трябва да прави.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent-name">Име</Label>
              <Input
                id="agent-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="напр. EFI Apply Form Test"
              />
            </div>
            <div>
              <Label htmlFor="agent-desc">Описание</Label>
              <Input
                id="agent-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Кратко описание за какво е"
              />
            </div>
            <div>
              <Label htmlFor="agent-prompt">Задача (prompt)</Label>
              <Textarea
                id="agent-prompt"
                rows={6}
                value={form.task_prompt}
                onChange={(e) => setForm((f) => ({ ...f, task_prompt: e.target.value }))}
                placeholder="Какво точно трябва да направи агентът при всяко изпълнение..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="agent-cron">Cron график</Label>
                <Input
                  id="agent-cron"
                  value={form.schedule_cron}
                  onChange={(e) => setForm((f) => ({ ...f, schedule_cron: e.target.value }))}
                  placeholder="0 8 * * *"
                  className="font-mono"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {CRON_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                      onClick={() => setForm((f) => ({ ...f, schedule_cron: p.value }))}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="agent-tz">Часова зона</Label>
                <Input
                  id="agent-tz"
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="Europe/Sofia"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="agent-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="agent-active">Активен</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отказ
            </Button>
            <Button onClick={handleSave}>{editing ? "Запиши" : "Създай"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog
        open={historyAgent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryAgent(null);
            setHistoryRuns([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>История: {historyAgent?.name}</DialogTitle>
            <DialogDescription>Последните 30 изпълнения</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : historyRuns.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              Няма записани изпълнения.
            </div>
          ) : (
            <div className="rounded-xl border overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Кога</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Отнело</TableHead>
                    <TableHead>Тригер</TableHead>
                    <TableHead>Output / грешка</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRuns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {format(new Date(r.started_at), "dd.MM HH:mm", { locale: bg })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.duration_ms != null ? `${Math.round(r.duration_ms / 1000)}s` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{r.triggered_by ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-md">
                        {r.error_message ? (
                          <span className="text-red-500">{r.error_message}</span>
                        ) : (
                          <span className="text-muted-foreground line-clamp-2">
                            {r.output_summary ?? "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
