import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Circle, ChevronRight, Sparkles, Lightbulb, FlaskConical, FileText, Rocket, TrendingUp, Loader2, Play, XCircle } from "lucide-react";
import { useAIExecution } from "@/hooks/useAIExecution";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const PHASES = [
  {
    key: "idea",
    label: "Идея",
    icon: Lightbulb,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    milestones: [
      { title: "Дефинирай проблема, който решаваш", description: "Запиши ясно какъв проблем решава продуктът/услугата ти" },
      { title: "Определи целевата си аудитория", description: "Кой е твоят идеален клиент? Възраст, интереси, болки" },
      { title: "Провери дали проблемът съществува", description: "Говори с минимум 10 потенциални клиента" },
    ],
  },
  {
    key: "validation",
    label: "Валидиране",
    icon: FlaskConical,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
    milestones: [
      { title: "Създай MVP (минимален продукт)", description: "Най-простата версия, с която да тестваш идеята" },
      { title: "Вземи първите 5 плащащи клиента", description: "Парите = валидация. Без пари = нема бизнес" },
      { title: "Събери обратна връзка и итерирай", description: "Какво харесват? Какво не харесват?" },
    ],
  },
  {
    key: "planning",
    label: "Планиране",
    icon: FileText,
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/20",
    milestones: [
      { title: "Създай бизнес план", description: "Финансови прогнози, бизнес модел, стратегия" },
      { title: "Регистрирай фирма", description: "Избери правна форма и регистрирай" },
      { title: "Определи ценова стратегия", description: "Как ще ценообразуваш продуктите/услугите" },
    ],
  },
  {
    key: "launch",
    label: "Стартиране",
    icon: Rocket,
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/20",
    milestones: [
      { title: "Изгради онлайн присъствие", description: "Уебсайт, социални мрежи, Google профил" },
      { title: "Първа маркетинг кампания", description: "Платена реклама или органично съдържание" },
      { title: "Достигни 10 клиента", description: "Фокусирай се върху продажби, не перфекционизъм" },
    ],
  },
  {
    key: "growth",
    label: "Растеж",
    icon: TrendingUp,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    milestones: [
      { title: "Автоматизирай повтарящите се процеси", description: "CRM, имейли, фактуриране — освободи времето си" },
      { title: "Изгради екип", description: "Делегирай задачите, в които не си най-добър" },
      { title: "Скалирай маркетинга", description: "Удвои каналите, които работят" },
    ],
  },
];

export default function StartupPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { execute, isRunning, results, clearResult } = useAIExecution();

  const { data: milestones = [] } = useQuery({
    queryKey: ["startup_milestones", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_milestones")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({ phase, title, completed }: { phase: string; title: string; completed: boolean }) => {
      // Check if exists
      const existing = milestones.find(m => m.phase === phase && m.title === title);
      if (existing) {
        const { error } = await supabase
          .from("startup_milestones")
          .update({ completed })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const phaseIndex = PHASES.findIndex(p => p.key === phase);
        const { error } = await supabase
          .from("startup_milestones")
          .insert({ user_id: user!.id, phase, title, completed, order_index: phaseIndex });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["startup_milestones"] }),
    onError: () => toast.error("Грешка"),
  });

  const isCompleted = (phase: string, title: string) => {
    const m = milestones.find(m => m.phase === phase && m.title === title);
    return m?.completed ?? false;
  };

  const phaseProgress = (phaseKey: string) => {
    const phase = PHASES.find(p => p.key === phaseKey)!;
    const done = phase.milestones.filter(m => isCompleted(phaseKey, m.title)).length;
    return { done, total: phase.milestones.length };
  };

  const totalDone = PHASES.flatMap(p => p.milestones).filter(m =>
    PHASES.some(p => isCompleted(p.key, m.title))
  ).length;

  const totalMilestones = PHASES.reduce((acc, p) => acc + p.milestones.length, 0);
  const overallProgress = Math.round((milestones.filter(m => m.completed).length / totalMilestones) * 100);

  const currentPhase = PHASES.find(p => {
    const { done, total } = phaseProgress(p.key);
    return done < total;
  }) || PHASES[PHASES.length - 1];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Стартирай бизнес</h1>
            <p className="text-muted-foreground mt-1">Твоят пътеводител от идея до работещ бизнес</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
            <div className="text-xs text-muted-foreground">завършено</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {/* Current phase highlight */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <currentPhase.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Текуща фаза</p>
              <p className="font-semibold">{currentPhase.label}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/assistant")}>
                <Sparkles className="h-3.5 w-3.5" /> AI помощ
              </Button>
              <Button size="sm" onClick={() => navigate("/business-plan")}>
                Бизнес план <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Phases */}
        <div className="space-y-4">
          {PHASES.map((phase, pi) => {
            const { done, total } = phaseProgress(phase.key);
            const PhaseIcon = phase.icon;
            const isCurrentPhase = phase.key === currentPhase.key;
            const isPastPhase = done === total;

            return (
              <motion.div
                key={phase.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: pi * 0.07 }}
              >
                <Card className={cn(
                  "transition-colors",
                  isCurrentPhase && "border-primary/40",
                  isPastPhase && !isCurrentPhase && "opacity-75"
                )}>
                  <CardContent className="p-4 md:p-5">
                    {/* Phase header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("p-2 rounded-xl border shrink-0", phase.bg)}>
                        <PhaseIcon className={cn("h-5 w-5", phase.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{phase.label}</span>
                          {isCurrentPhase && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Текуща</Badge>}
                          {isPastPhase && <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">✓ Завършена</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{done}/{total} задачи</p>
                      </div>
                      {/* Mini progress */}
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(done / total) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="space-y-2 pl-1">
                      {phase.milestones.map((m, mi) => {
                        const done = isCompleted(phase.key, m.title);
                        const taskKey = `${phase.key}:${mi}`;
                        const running = isRunning(taskKey);
                        const aiResult = results[taskKey];
                        return (
                          <div key={mi}>
                            <button
                              className={cn(
                                "w-full flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left group",
                                running && "opacity-70 cursor-wait"
                              )}
                              disabled={running}
                              onClick={async () => {
                                if (done) {
                                  toggleMilestone.mutate({ phase: phase.key, title: m.title, completed: false });
                                  return;
                                }
                                const result = await execute(taskKey, m.title, m.description);
                                if (result.ok) {
                                  toggleMilestone.mutate({ phase: phase.key, title: m.title, completed: true });
                                }
                              }}
                            >
                              <div className="shrink-0 mt-0.5">
                                {running
                                  ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  : done
                                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                                    : <Play className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                }
                              </div>
                              <div className="flex-1">
                                <p className={cn("font-medium text-sm", done && "line-through text-muted-foreground")}>{m.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                              </div>
                            </button>
                            {aiResult && (
                              <div className={cn(
                                "ml-11 mr-3 mt-1 mb-1 px-3 py-2 rounded-lg text-xs flex items-start gap-2",
                                aiResult.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                              )}>
                                {aiResult.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                                <span className="flex-1 line-clamp-2">{aiResult.message}</span>
                                <button onClick={() => clearResult(taskKey)} className="text-muted-foreground hover:text-foreground shrink-0">&times;</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
