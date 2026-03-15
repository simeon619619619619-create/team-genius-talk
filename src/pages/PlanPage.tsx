import { useState, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronRight, Lock, Bot, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";

export default function PlanPage() {
  const { projectId, projectName, loading: projectLoading } = useCurrentProject();
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [showSyncPreview, setShowSyncPreview] = useState(false);
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
            {marketingTeam.map(bot => (
              <div key={bot.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-secondary/40 shrink-0">
                <div
                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: bot.shirtColor }}
                >
                  {bot.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">{bot.name}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{bot.role}</p>
                </div>
              </div>
            ))}
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