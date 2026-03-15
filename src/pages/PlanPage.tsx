import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronRight, ChevronDown, Lock, Bot, Users, Plus, ListTodo, Calendar, Target, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AiBot } from "@/components/teams/VirtualOffice";
import { MainLayout } from "@/components/layout/MainLayout";
import { PlanStepCard } from "@/components/plan/PlanStepCard";
import { ExportPdfButton } from "@/components/plan/ExportPdfButton";
import { GenerateScheduleDialog } from "@/components/plan/GenerateScheduleDialog";
import { SyncPreviewDialog } from "@/components/plan/SyncPreviewDialog";
import { WebsiteOfferDialog } from "@/components/plan/WebsiteOfferDialog";
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
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import confetti from "canvas-confetti";

export default function PlanPage() {
  const { projectId, projectName, loading: projectLoading } = useCurrentProject();
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [showWebsiteOffer, setShowWebsiteOffer] = useState(false);
  const navigate = useNavigate();
  const { tasks, addTask, addSubtask } = useTasks();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(true);
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

  // Monthly campaign strategy templates
  const campaignTemplates = [
    {
      id: "awareness",
      title: "Brand Awareness кампания",
      description: "Увеличаване на познаваемостта на бранда чрез соц. мрежи и PR",
      icon: Sparkles,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      tasks: [
        "Дефинирай целева аудитория",
        "Създай визуална концепция",
        "Планирай 20 поста за месеца",
        "Настрой paid ads бюджет",
        "Партньорства с 3 инфлуенсъра",
        "Седмичен отчет на reach & impressions",
      ],
    },
    {
      id: "lead-gen",
      title: "Lead Generation кампания",
      description: "Генериране на нови лийдове чрез landing pages, email и ads",
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      tasks: [
        "Създай landing page с оферта",
        "Настрой lead magnet (PDF/видео)",
        "Email nurture последователност (5 имейла)",
        "Facebook/Instagram Lead Ads",
        "Retargeting на посетители",
        "A/B тест на CTA бутони",
      ],
    },
    {
      id: "sales",
      title: "Промоционална кампания",
      description: "Директни продажби чрез отстъпки, оферти и urgency тактики",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      tasks: [
        "Дефинирай промо оферта и период",
        "Създай промо визии и банери",
        "Email blast до цялата база",
        "Stories countdown за краен срок",
        "SMS кампания до VIP клиенти",
        "Пост-кампания анализ на ROI",
      ],
    },
    {
      id: "content",
      title: "Content Marketing кампания",
      description: "Дългосрочна стратегия с полезно съдържание за привличане на аудитория",
      icon: Calendar,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      tasks: [
        "Проучи 10 теми за блог/видео",
        "Създай контент календар",
        "Заснеми 4 образователни видеа",
        "Напиши 4 блог статии",
        "SEO оптимизация на съдържанието",
        "Разпространи в соц. мрежи и newsletter",
      ],
    },
  ];

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
    const success = await syncToBusinessPlan(steps, editedGoals);
    setShowSyncPreview(false);
    if (success) {
      setShowWebsiteOffer(true);
    }
  }, [syncToBusinessPlan, steps]);

  const completedCount = steps.filter(s => s.completed).length;
  const allStepsCompleted = completedCount === steps.length && steps.length > 0;
  const activeStep = steps.find(s => s.id === activeStepId);
  const currentIsLastStep = isLastStep();

  // Set active step when steps load
  useEffect(() => {
    if (steps.length > 0 && !activeStepId) {
      const firstIncomplete = steps.find(s => !s.completed);
      setActiveStepId(firstIncomplete?.id || steps[0].id);
    }
  }, [steps, activeStepId]);

  // Auto-collapse plan when all steps are completed
  useEffect(() => {
    if (allStepsCompleted) {
      setPlanOpen(false);
    }
  }, [allStepsCompleted]);
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

        {/* Marketing Plan - Collapsible */}
        <Collapsible open={planOpen} onOpenChange={setPlanOpen}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "w-full flex items-center justify-between gap-3 rounded-2xl p-3 md:p-4 text-left transition-all",
              allStepsCompleted
                ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                : "bg-card border border-border/50 hover:bg-secondary/40"
            )}>
              <div className="flex items-center gap-3">
                {allStepsCompleted ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                    <Check className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-md shadow-primary/20">
                    <span className="text-sm font-bold">{completedCount}/{steps.length}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm md:text-base">
                    Маркетинг план
                    {allStepsCompleted && <span className="text-emerald-600 dark:text-emerald-400 ml-2 text-xs font-medium">Завършен</span>}
                  </p>
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    {allStepsCompleted
                      ? "Всички стъпки са завършени. Преминете към месечни кампании."
                      : `${completedCount} от ${steps.length} стъпки завършени`
                    }
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                planOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-3">
              {/* Steps List */}
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
          </CollapsibleContent>
        </Collapsible>

        {/* Monthly Campaign Strategies */}
        {allStepsCompleted && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-2xl font-display font-bold text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  Месечни кампании
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Изберете стратегия и стартирайте кампания за месеца
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {campaignTemplates.map((campaign) => {
                const Icon = campaign.icon;
                return (
                  <div
                    key={campaign.id}
                    className={cn(
                      "rounded-2xl border border-border/50 p-4 md:p-5 transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer group",
                      campaign.bgColor
                    )}
                    onClick={async () => {
                      // Check if campaign task already exists
                      const alreadyExists = tasks.some(t => t.title === campaign.title && t.status !== "done");
                      if (alreadyExists) return;

                      // Create ONE parent task for the campaign
                      const members = marketingTeam.map(m => m.name);
                      const parentTask = await addTask({
                        title: campaign.title,
                        description: campaign.description,
                        priority: "high",
                        assignee_name: members[0] || null,
                      });

                      if (parentTask) {
                        // Add each campaign step as a subtask
                        for (let i = 0; i < campaign.tasks.length; i++) {
                          const assignee = members[i % members.length];
                          await addSubtask(parentTask.id, {
                            title: campaign.tasks[i],
                            assignee_name: assignee,
                          });
                        }
                      }
                      triggerConfetti();
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-110",
                        "bg-white dark:bg-gray-900 shadow-sm"
                      )}>
                        <Icon className={cn("h-5 w-5", campaign.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors">
                          {campaign.title}
                        </h3>
                        <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">
                          {campaign.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {campaign.tasks.map((task, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-current shrink-0" />
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <span className="text-[10px] md:text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Стартирай кампания <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sync Preview Dialog */}
      <SyncPreviewDialog
        open={showSyncPreview}
        onOpenChange={setShowSyncPreview}
        steps={steps}
        onConfirm={handleConfirmSync}
      />

      {/* Website Generation Offer */}
      <WebsiteOfferDialog
        open={showWebsiteOffer}
        onOpenChange={setShowWebsiteOffer}
        onGenerateWebsite={() => {
          setShowWebsiteOffer(false);
          navigate("/websites?fromPlan=true");
        }}
        onGoToBusinessPlan={() => {
          setShowWebsiteOffer(false);
          navigate("/business-plan");
        }}
      />
    </MainLayout>;
}