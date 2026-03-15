import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronRight, Lock, Bot, Users, Plus, ListTodo, Calendar } from "lucide-react";
import type { AiBot } from "@/components/teams/VirtualOffice";
import { MainLayout } from "@/components/layout/MainLayout";
import { PlanStepCard } from "@/components/plan/PlanStepCard";
import { ExportPdfButton } from "@/components/plan/ExportPdfButton";
import { GenerateScheduleDialog } from "@/components/plan/GenerateScheduleDialog";
import { SyncPreviewDialog } from "@/components/plan/SyncPreviewDialog";
import { usePlanSteps } from "@/hooks/usePlanSteps";
import { useGlobalBots } from "@/hooks/useGlobalBots";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { useSyncBusinessPlan } from "@/hooks/useSyncBusinessPlan";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";

export default function PlanPage() {
  const { projectId, projectName, loading: projectLoading } = useCurrentProject();
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const { tasks, addTask } = useTasks();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const {
    steps,
    loading,
    toggleStepComplete,
    updateContent
  } = usePlanSteps(projectId);
  const {
    globalBots,
    getBotForStep,
    loading: botsLoading
  } = useGlobalBots();
  const { syncToBusinessPlan } = useSyncBusinessPlan(projectId);

  // Task templates per role
  const taskTemplates: Record<string, { title: string; priority: "low" | "medium" | "high" }[]> = {
    "Email & Комуникации": [
      { title: "Изпрати седмичен newsletter", priority: "high" },
      { title: "Настрой автоматичен welcome email", priority: "medium" },
      { title: "Създай email кампания за промоция", priority: "high" },
      { title: "Обнови email шаблоните", priority: "medium" },
      { title: "Анализирай open/click rate", priority: "low" },
      { title: "Сегментирай email листата", priority: "medium" },
      { title: "A/B тест на subject lines", priority: "low" },
      { title: "Настрой имейл за изоставена количка", priority: "high" },
    ],
    "Съдържание & Соц. Мрежи": [
      { title: "Създай контент календар за месеца", priority: "high" },
      { title: "Подготви 5 Instagram поста", priority: "high" },
      { title: "Заснеми 3 Reels видеа", priority: "medium" },
      { title: "Напиши копи за Stories", priority: "medium" },
      { title: "Дизайн на карусел пост", priority: "medium" },
      { title: "Отговори на коментари и DM-и", priority: "high" },
      { title: "Проучи trending хаштагове", priority: "low" },
      { title: "Планирай колаборация с инфлуенсър", priority: "medium" },
    ],
    "Продажби & Клиенти": [
      { title: "Follow-up на нови лийдове", priority: "high" },
      { title: "Обади се на топ 10 клиенти", priority: "high" },
      { title: "Обнови CRM с нови контакти", priority: "medium" },
      { title: "Подготви оферта за клиент", priority: "high" },
      { title: "Анализирай конверсии за месеца", priority: "medium" },
      { title: "Настрой Stripe промо код", priority: "low" },
      { title: "Създай re-engagement кампания", priority: "medium" },
      { title: "Провери плащания и фактури", priority: "low" },
    ],
  };

  // Marketing team - always visible
  const marketingTeam = useMemo(() => {
    // Start with hardcoded core marketing team
    const coreTeam = [
      { id: "bot-2", name: "Мария", role: "Email & Комуникации", shirtColor: "#f472b6" },
      { id: "bot-3", name: "Ивана", role: "Съдържание & Соц. Мрежи", shirtColor: "#818cf8" },
      { id: "bot-6", name: "Лина", role: "Продажби & Клиенти", shirtColor: "#fbbf24" },
    ];
    // Also add any custom marketing bots from localStorage
    try {
      const saved = localStorage.getItem("simora_ai_bots");
      if (saved) {
        const bots: AiBot[] = JSON.parse(saved);
        const keywords = ["контент", "съдържание", "соц. мрежи", "email", "комуникации", "маркетинг", "продажби", "content", "social"];
        const coreIds = new Set(coreTeam.map(b => b.id));
        bots
          .filter(b => !coreIds.has(b.id))
          .filter(b => {
            const roleL = b.role.toLowerCase();
            const skillsStr = (b.skills || []).join(" ").toLowerCase();
            return keywords.some(k => roleL.includes(k) || skillsStr.includes(k));
          })
          .forEach(b => coreTeam.push({ id: b.id, name: b.name, role: b.role, shirtColor: b.shirtColor }));
      }
    } catch { /* ignore */ }
    return coreTeam;
  }, []);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
    });
  }, []);

  const handleToggleComplete = useCallback((stepId: string, currentlyCompleted: boolean) => {
    toggleStepComplete(stepId);
    // Trigger confetti when marking as complete (not when unmarking)
    if (!currentlyCompleted) {
      triggerConfetti();
    }
  }, [toggleStepComplete, triggerConfetti]);

  // Check if active step is the last step
  const isLastStep = useCallback(() => {
    if (!activeStepId || steps.length === 0) return false;
    const currentIndex = steps.findIndex(s => s.id === activeStepId);
    return currentIndex === steps.length - 1;
  }, [activeStepId, steps]);

  const handleGoToNextStep = useCallback(async () => {
    if (!activeStepId) return;
    const currentIndex = steps.findIndex(s => s.id === activeStepId);
    
    // If this is the last step, show preview dialog instead of navigating
    if (currentIndex === steps.length - 1) {
      setShowSyncPreview(true);
      return;
    }
    
    // Otherwise go to next step
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  }, [activeStepId, steps]);

  const handleConfirmSync = useCallback(async (editedGoals?: Array<{ id: string; title: string; description: string; category: string; priority: string }>) => {
    await syncToBusinessPlan(steps, editedGoals);
    setShowSyncPreview(false);
  }, [syncToBusinessPlan, steps]);

  // Set active step when steps load
  useEffect(() => {
    if (steps.length > 0 && !activeStepId) {
      const firstIncomplete = steps.find(s => !s.completed);
      setActiveStepId(firstIncomplete?.id || steps[0].id);
    }
  }, [steps, activeStepId]);
  
  const completedCount = steps.filter(s => s.completed).length;
  const allStepsCompleted = completedCount === steps.length && steps.length > 0;
  const progress = steps.length > 0 ? completedCount / steps.length * 100 : 0;
  const activeStep = steps.find(s => s.id === activeStepId);
  const currentIsLastStep = isLastStep();
  if (loading || botsLoading || projectLoading) {
    return <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
            <Skeleton className="lg:col-span-2 h-96" />
          </div>
        </div>
      </MainLayout>;
  }
  return <MainLayout>
      <div className="space-y-3 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl md:text-3xl font-display font-bold text-foreground truncate">
            Маркетинг план
          </h1>
          
          <div className="flex gap-1.5 md:gap-2 shrink-0">
            <GenerateScheduleDialog projectId={projectId || ""} allStepsCompleted={allStepsCompleted} />
            <ExportPdfButton steps={steps} bots={globalBots} projectName={projectName} />
          </div>
        </div>

        {/* Marketing Team */}
        {marketingTeam.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border/50 bg-card/50 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-semibold text-muted-foreground">Екип:</span>
            </div>
            {marketingTeam.map(bot => {
              const botTasks = tasks.filter(t => t.assignee_name === bot.name && t.status !== "done");
              return (
                <Popover key={bot.id} open={openPopover === bot.id} onOpenChange={(open) => {
                  setOpenPopover(open ? bot.id : null);
                  if (!open) { setTaskTitle(""); setTaskPriority("medium"); setTaskDueDate(""); }
                }}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-secondary/40 shrink-0 hover:bg-secondary/70 transition-colors relative group">
                      <div
                        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: bot.shirtColor }}
                      >
                        {bot.name[0]}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-medium">{bot.name}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight">{bot.role}</p>
                      </div>
                      {botTasks.length > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px] font-bold">
                          {botTasks.length}
                        </Badge>
                      )}
                      <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ background: bot.shirtColor }}
                        >
                          {bot.name[0]}
                        </div>
                        <span className="text-sm font-semibold">{bot.name}</span>
                        <span className="text-[10px] text-muted-foreground">{bot.role}</span>
                      </div>

                      {/* Existing tasks for this member */}
                      {botTasks.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Активни задачи</p>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {botTasks.map(t => (
                              <div key={t.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-secondary/30">
                                <ListTodo className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="flex-1 truncate">{t.title}</span>
                                <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4",
                                  t.priority === "high" ? "border-red-300 text-red-600" :
                                  t.priority === "medium" ? "border-amber-300 text-amber-600" : "border-green-300 text-green-600"
                                )}>
                                  {t.priority === "high" ? "!" : t.priority === "medium" ? "•" : "○"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Task templates */}
                      <div className={botTasks.length > 0 ? "border-t border-border pt-2" : ""}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Възложи задача</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {(taskTemplates[bot.role] || []).map((tmpl, i) => {
                            const alreadyAdded = tasks.some(t => t.assignee_name === bot.name && t.title === tmpl.title && t.status !== "done");
                            return (
                              <button
                                key={i}
                                disabled={alreadyAdded}
                                className={cn(
                                  "w-full flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg text-left transition-colors",
                                  alreadyAdded
                                    ? "opacity-40 cursor-not-allowed bg-secondary/20"
                                    : "hover:bg-secondary/60 cursor-pointer"
                                )}
                                onClick={() => {
                                  if (!alreadyAdded) {
                                    addTask({
                                      title: tmpl.title,
                                      assignee_name: bot.name,
                                      priority: tmpl.priority,
                                    });
                                  }
                                }}
                              >
                                {alreadyAdded ? (
                                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                                ) : (
                                  <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
                                )}
                                <span className="flex-1">{tmpl.title}</span>
                                <span className={cn("text-[9px] px-1.5 py-0 rounded-full",
                                  tmpl.priority === "high" ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" :
                                  tmpl.priority === "medium" ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" :
                                  "bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400"
                                )}>
                                  {tmpl.priority === "high" ? "Високо" : tmpl.priority === "medium" ? "Средно" : "Ниско"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom task input */}
                      <div className="border-t border-border pt-2">
                        <div className="flex gap-1.5">
                          <Input
                            placeholder="Или напиши своя..."
                            value={taskTitle}
                            onChange={e => setTaskTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && taskTitle.trim()) {
                                addTask({ title: taskTitle.trim(), assignee_name: bot.name, priority: "medium" });
                                setTaskTitle("");
                              }
                            }}
                            className="h-7 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2 shrink-0"
                            disabled={!taskTitle.trim()}
                            onClick={() => {
                              if (taskTitle.trim()) {
                                addTask({ title: taskTitle.trim(), assignee_name: bot.name, priority: "medium" });
                                setTaskTitle("");
                              }
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        )}

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Steps List - Scrollable on mobile */}
          <div className="lg:col-span-1 space-y-2">
            {steps.map((step, index) => {
            const assignedBot = getBotForStep(step.title);
            const previousStepsCompleted = index === 0 || steps.slice(0, index).every(s => s.generated_content || s.completed);
            const isLocked = !previousStepsCompleted;
            const isActive = activeStepId === step.id;
            
            return (
              <button 
                key={step.id} 
                onClick={() => !isLocked && setActiveStepId(step.id)} 
                disabled={isLocked} 
                className={cn(
                  "w-full flex items-center gap-3 md:gap-4 rounded-2xl p-3 md:p-4 text-left",
                  "transition-all duration-300 ease-out",
                  "border border-transparent active:scale-[0.98]",
                  isLocked 
                    ? "opacity-50 cursor-not-allowed bg-secondary/20" 
                    : isActive 
                      ? "bg-card shadow-lg shadow-primary/5 border-primary/20" 
                      : "hover:bg-secondary/60"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl shrink-0 overflow-hidden",
                  "transition-all duration-300 ease-out",
                  isLocked 
                    ? "bg-muted/30 border border-muted-foreground/10" 
                    : step.completed 
                      ? "bg-success text-success-foreground shadow-md shadow-success/20" 
                      : isActive 
                        ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20" 
                        : "bg-secondary/80 border border-border/50"
                )}>
                  {step.completed ? (
                    <Check className="h-5 w-5 animate-scale-in" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  ) : assignedBot?.avatar_url ? (
                    <img src={assignedBot.avatar_url} alt={assignedBot.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-semibold text-foreground">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate transition-colors duration-200 text-sm md:text-base",
                    isLocked ? "text-muted-foreground/60" : step.completed ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  {isLocked ? (
                    <p className="text-[11px] md:text-xs text-muted-foreground/50 truncate mt-0.5">
                      Завършете предишните стъпки
                    </p>
                  ) : assignedBot && (
                    <p className="text-[11px] md:text-xs text-primary/80 truncate flex items-center gap-1 mt-0.5">
                      <Bot className="h-3 w-3" />
                      {assignedBot.name}
                    </p>
                  )}
                </div>
                <ChevronRight className={cn(
                  "h-5 w-5 shrink-0 transition-all duration-300",
                  isLocked 
                    ? "text-muted-foreground/30" 
                    : isActive 
                      ? "text-primary" 
                      : "text-muted-foreground/50"
                )} />
              </button>
            );
          })}
          </div>

          {/* Active Step Details */}
          {activeStep && projectId && <PlanStepCard step={activeStep} stepNumber={steps.findIndex(s => s.id === activeStep.id) + 1} isActive={true} bot={getBotForStep(activeStep.title)} projectId={projectId} onSelect={() => {}} onToggleComplete={() => handleToggleComplete(activeStep.id, activeStep.completed)} onContentUpdate={content => updateContent(activeStep.id, content)} onGoToNextStep={handleGoToNextStep} isLastStep={currentIsLastStep} />}
        </div>
      </div>

      {/* Sync Preview Dialog */}
      <SyncPreviewDialog
        open={showSyncPreview}
        onOpenChange={setShowSyncPreview}
        steps={steps}
        onConfirm={handleConfirmSync}
      />
    </MainLayout>;
}