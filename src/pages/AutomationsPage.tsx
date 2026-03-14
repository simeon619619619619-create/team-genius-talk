import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Mail, Users, FileText, Headphones, Share2,
  Zap, TrendingUp, Clock, CheckCircle2, Pause, BarChart3,
  ArrowRight, Sparkles, Link2, Building2, ExternalLink, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { key: "crm", label: "CRM & Продажби", icon: Users, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { key: "email", label: "Имейл маркетинг", icon: Mail, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { key: "social", label: "Социални мрежи", icon: Share2, color: "bg-pink-500/10 text-pink-500 border-pink-500/20" },
  { key: "invoicing", label: "Фактуриране", icon: FileText, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { key: "support", label: "Клиентска поддръжка", icon: Headphones, color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { key: "other", label: "Друго", icon: Zap, color: "bg-muted text-muted-foreground border-border" },
];

const STATUS_MAP = {
  planning: { label: "Планиране", color: "bg-muted text-muted-foreground" },
  active: { label: "Активно", color: "bg-green-500/10 text-green-600" },
  paused: { label: "Паузирано", color: "bg-yellow-500/10 text-yellow-600" },
  done: { label: "Завършено", color: "bg-primary/10 text-primary" },
};

const AUTOMATION_IDEAS = [
  { category: "crm", title: "Автоматичен follow-up", desc: "Изпращай съобщения автоматично след среща или демо" },
  { category: "email", title: "Welcome поредица", desc: "Автоматична последователност за нови клиенти" },
  { category: "social", title: "Планиране на постове", desc: "Автоматично публикуване по график" },
  { category: "invoicing", title: "Автоматични фактури", desc: "Генерирай и изпращай фактури при плащане" },
  { category: "support", title: "AI чатбот", desc: "24/7 отговори на чести въпроси" },
  { category: "crm", title: "Lead scoring", desc: "Автоматично класиране на потенциални клиенти" },
];

export default function AutomationsPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", description: "", roi_estimate: "" });

  // Check GHL integration status
  const { data: ghlIntegration } = useQuery({
    queryKey: ["ghl_integration", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("ghl_integrations").select("api_key, location_id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["automation_projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("automation_projects").insert({
        user_id: user!.id,
        name: form.name,
        category: form.category,
        description: form.description,
        roi_estimate: form.roi_estimate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_projects"] });
      setOpen(false);
      setForm({ name: "", category: "", description: "", roi_estimate: "" });
      toast.success("Автоматизацията е добавена!");
    },
    onError: () => toast.error("Грешка при добавяне"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("automation_projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation_projects"] }),
  });

  const active = projects.filter(p => p.status === "active").length;
  const planning = projects.filter(p => p.status === "planning").length;
  const done = projects.filter(p => p.status === "done").length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Автоматизации</h1>
            <p className="text-muted-foreground mt-1">Управлявай и проследявай автоматизациите на бизнеса си</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>

            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Нова автоматизация</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добави автоматизация</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Наименование</Label>
                  <Input placeholder="напр. Автоматичен имейл follow-up" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Категория</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Избери категория" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Описание</Label>
                  <Textarea placeholder="Какво автоматизира?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Очакван резултат / ROI</Label>
                  <Input placeholder="напр. Спестява 5 часа/седмица" value={form.roi_estimate} onChange={e => setForm(f => ({ ...f, roi_estimate: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => createProject.mutate()} disabled={!form.name || !form.category || createProject.isPending}>
                  {createProject.isPending ? "Добавяне..." : "Добави"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: "Активни", value: active, icon: TrendingUp, color: "text-green-500" },
            { label: "Планиране", value: planning, icon: Clock, color: "text-yellow-500" },
            { label: "Завършени", value: done, icon: CheckCircle2, color: "text-primary" },
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

        {/* Business profile + Integrations bar */}
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Business profile summary */}
          {profile?.business_profile && Object.keys(profile.business_profile).length > 0 && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 shrink-0">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Бизнес профил</p>
                  <p className="font-semibold text-sm truncate">{(profile.business_profile as Record<string,string>).industry || "–"}</p>
                  <p className="text-xs text-muted-foreground">
                    {(profile.business_profile as Record<string,string>).team_size} · {(profile.business_profile as Record<string,string>).revenue}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0 text-xs" onClick={() => navigate("/settings")}>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* GHL integration status */}
          <Card className={cn(ghlIntegration ? "border-green-500/20 bg-green-500/5" : "border-dashed")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl shrink-0", ghlIntegration ? "bg-green-500/10" : "bg-muted")}>
                <Link2 className={cn("h-5 w-5", ghlIntegration ? "text-green-500" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">GoHighLevel CRM</p>
                {ghlIntegration ? (
                  <p className="font-semibold text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Свързан
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Не е свързан</p>
                )}
              </div>
              {!ghlIntegration && (
                <Button size="sm" variant="outline" className="shrink-0 text-xs gap-1.5" onClick={() => navigate("/settings")}>
                  <ExternalLink className="h-3 w-3" /> Свържи
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        {projects.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Твоите автоматизации</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {projects.map((p, i) => {
                const cat = CATEGORIES.find(c => c.key === p.category) || CATEGORIES[5];
                const status = STATUS_MAP[p.status as keyof typeof STATUS_MAP];
                const CatIcon = cat.icon;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="hover:border-primary/40 transition-colors">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className={cn("p-2.5 rounded-xl border shrink-0", cat.color)}>
                          <CatIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold truncate">{p.name}</p>
                            <Badge className={cn("shrink-0 text-xs", status.color)}>{status.label}</Badge>
                          </div>
                          {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                          {p.roi_estimate && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <BarChart3 className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-xs text-green-600 font-medium">{p.roi_estimate}</span>
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            {p.status !== "active" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: p.id, status: "active" })}>
                                Активирай
                              </Button>
                            )}
                            {p.status === "active" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: p.id, status: "paused" })}>
                                <Pause className="h-3 w-3 mr-1" /> Паузирай
                              </Button>
                            )}
                            {p.status !== "done" && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => updateStatus.mutate({ id: p.id, status: "done" })}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Завърши
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Ideas / Getting started */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">{projects.length === 0 ? "От къде да започнеш?" : "Идеи за нови автоматизации"}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {AUTOMATION_IDEAS.map((idea, i) => {
              const cat = CATEGORIES.find(c => c.key === idea.category)!;
              const IdeaIcon = cat.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
                  <Card className="cursor-pointer hover:border-primary/40 transition-colors group" onClick={() => {
                    setForm(f => ({ ...f, name: idea.title, category: idea.category, description: idea.desc }));
                    setOpen(true);
                  }}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg border shrink-0", cat.color)}>
                        <IdeaIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{idea.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{idea.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
