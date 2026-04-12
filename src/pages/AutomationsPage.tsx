import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useWorkflows } from "@/hooks/useWorkflows";
import {
  Plus, Zap, TrendingUp, Clock, CheckCircle2,
  Play, Pause, Trash2, MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { WorkflowStatus } from "@/types/workflow";

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string }> = {
  draft: { label: "Чернова", color: "bg-muted text-muted-foreground" },
  active: { label: "Активен", color: "bg-green-500/10 text-green-600" },
  paused: { label: "Пауза", color: "bg-yellow-500/10 text-yellow-600" },
  archived: { label: "Архивиран", color: "bg-muted text-muted-foreground" },
};

export default function AutomationsPage() {
  const navigate = useNavigate();
  const { workflows, isLoading, createWorkflow, updateWorkflow, deleteWorkflow } = useWorkflows();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const active = workflows.filter((w) => w.status === "active").length;
  const draft = workflows.filter((w) => w.status === "draft").length;
  const completed = workflows.filter((w) => w.status === "archived").length;

  const handleCreate = async () => {
    if (!form.name) return;
    const result = await createWorkflow.mutateAsync({
      name: form.name,
      description: form.description,
    });
    setOpen(false);
    setForm({ name: "", description: "" });
    navigate(`/workflow/${result.id}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Автоматизации</h1>
            <p className="text-muted-foreground mt-1">Визуални workflow-и управлявани от Симеон</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Нов Workflow</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Създай нов workflow</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Име</Label>
                  <Input placeholder="напр. Welcome поредица за нови клиенти" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Описание (опционално)</Label>
                  <Textarea placeholder="Какво прави този workflow?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={!form.name || createWorkflow.isPending}>
                  {createWorkflow.isPending ? "Създаване..." : "Създай и отвори"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: "Активни", value: active, icon: TrendingUp, color: "text-green-500" },
            { label: "Чернови", value: draft, icon: Clock, color: "text-yellow-500" },
            { label: "Архивирани", value: completed, icon: CheckCircle2, color: "text-primary" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={cn("h-8 w-8", s.color)} />
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {workflows.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Твоите Workflows</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {workflows.map((w, i) => {
                const status = STATUS_CONFIG[w.status];
                return (
                  <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate(`/workflow/${w.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary shrink-0" />
                            <p className="font-semibold truncate">{w.name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={cn("text-xs", status.color)}>{status.label}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {w.status !== "active" && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateWorkflow.mutate({ id: w.id, status: "active" }); }}>
                                    <Play className="h-4 w-4 mr-2" /> Активирай
                                  </DropdownMenuItem>
                                )}
                                {w.status === "active" && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateWorkflow.mutate({ id: w.id, status: "paused" }); }}>
                                    <Pause className="h-4 w-4 mr-2" /> Паузирай
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteWorkflow.mutate(w.id); }}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Изтрий
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {w.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{w.description}</p>}
                        <p className="text-xs text-muted-foreground mt-2">Последна промяна: {new Date(w.updated_at).toLocaleDateString("bg-BG")}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : !isLoading ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">Няма workflows</h3>
              <p className="text-muted-foreground text-sm mb-4">Създай първия си workflow и Симеон ще ти помогне да го построиш</p>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Създай първия workflow</Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </MainLayout>
  );
}
