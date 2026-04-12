import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { MainLayout } from "@/components/layout/MainLayout";
import { MindMapEditor } from "@/components/workflows/MindMapEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Square, Eye, Pencil, Sparkles } from "lucide-react";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Workflow, MindMapData, WorkflowEvent } from "@/types/workflow";

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { updateWorkflow } = useWorkflows();
  const { executions, events, activeExecution, startExecution, cancelExecution } = useWorkflowExecution(id || null);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Workflow;
    },
    enabled: !!id && !!user,
  });

  const getMindMapWithLiveStatus = useCallback((): MindMapData => {
    if (!workflow) return { nodes: [], edges: [] };
    const mapData = workflow.mind_map_json as MindMapData;
    if (!events.length) return mapData;

    const eventByNode = new Map<string, WorkflowEvent>();
    events.forEach((ev) => eventByNode.set(ev.node_id, ev));

    return {
      ...mapData,
      nodes: mapData.nodes.map((node) => {
        const event = eventByNode.get(node.id);
        return event
          ? { ...node, data: { ...node.data, eventStatus: event.status, eventOutput: JSON.stringify(event.output_data) } }
          : node;
      }),
    };
  }, [workflow, events]);

  const handleSave = useCallback(
    (data: MindMapData) => {
      if (!id) return;
      updateWorkflow.mutate({ id, mind_map_json: data });
    },
    [id, updateWorkflow]
  );

  const handleAiGenerate = async () => {
    if (!aiGoal || !id) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("workflow-generate", {
        body: { goal: aiGoal, workflow_id: id },
      });
      if (error) throw error;
      if (data?.mind_map_json) {
        toast.success("Симеон генерира workflow!");
        queryClient.invalidateQueries({ queryKey: ["workflow", id] });
      }
    } catch (err: any) {
      toast.error(`Грешка: ${err.message}`);
    } finally {
      setAiLoading(false);
      setAiOpen(false);
      setAiGoal("");
    }
  };

  const isRunning = activeExecution?.status === "running";

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!workflow) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Workflow не е намерен</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/automations")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Назад
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/automations")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold">{workflow.name}</h1>
            <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
              {workflow.status}
            </Badge>
            {isRunning && (
              <Badge className="bg-blue-500/10 text-blue-500 animate-pulse">
                Изпълнява се...
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Sparkles className="h-4 w-4 mr-1" /> Симеон AI
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Генерирай workflow с Симеон</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Опиши целта</Label>
                    <Textarea
                      placeholder="напр. Когато дойде нов клиент, изпрати welcome имейл, след 3 дни follow-up, ако не отвори — SMS"
                      value={aiGoal}
                      onChange={(e) => setAiGoal(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button className="w-full" onClick={handleAiGenerate} disabled={!aiGoal || aiLoading}>
                    {aiLoading ? "Симеон мисли..." : "Генерирай"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            >
              {mode === "edit" ? <Eye className="h-4 w-4 mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
              {mode === "edit" ? "Преглед" : "Редакция"}
            </Button>

            {isRunning ? (
              <Button variant="destructive" size="sm" onClick={() => cancelExecution.mutate(activeExecution!.id)}>
                <Square className="h-4 w-4 mr-1" /> Спри
              </Button>
            ) : (
              <Button size="sm" onClick={() => startExecution.mutate()}>
                <Play className="h-4 w-4 mr-1" /> Пусни
              </Button>
            )}
          </div>
        </div>

        {/* Mind map */}
        <div className="flex-1">
          <MindMapEditor
            initialData={isRunning ? getMindMapWithLiveStatus() : (workflow.mind_map_json as MindMapData)}
            onChange={handleSave}
            readOnly={mode === "view" || isRunning}
          />
        </div>

        {/* Execution log */}
        {events.length > 0 && (
          <div className="h-48 border-t bg-card overflow-y-auto shrink-0 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Лог на изпълнение ({events.filter(e => e.status === "done").length}/{events.length} стъпки)
            </p>
            <div className="space-y-1">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-xs">
                  <span className={
                    ev.status === "done" ? "text-green-500" :
                    ev.status === "running" ? "text-blue-500 animate-pulse" :
                    ev.status === "error" ? "text-red-500" :
                    "text-muted-foreground"
                  }>
                    {ev.status === "done" ? "✓" : ev.status === "running" ? "●" : ev.status === "error" ? "✗" : "○"}
                  </span>
                  <span className="text-muted-foreground">{ev.bot_id || "system"}</span>
                  <span className="truncate">
                    {ev.status === "done"
                      ? JSON.stringify(ev.output_data).slice(0, 100)
                      : ev.status === "error"
                      ? ev.error_message
                      : "pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
