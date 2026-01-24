import { useState, useEffect, useCallback } from "react";
import { Check, ChevronRight, Lock, Bot } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PlanStepCard } from "@/components/plan/PlanStepCard";
import { ExportPdfButton } from "@/components/plan/ExportPdfButton";
import { GenerateScheduleDialog } from "@/components/plan/GenerateScheduleDialog";
import { usePlanSteps } from "@/hooks/usePlanSteps";
import { useGlobalBots } from "@/hooks/useGlobalBots";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";
export default function PlanPage() {
  const {
    user
  } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  // Fetch user's project
  useEffect(() => {
    const fetchProject = async () => {
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from('projects').select('id, name').eq('owner_id', user.id).limit(1).maybeSingle();
      if (!error && data) {
        setProjectId(data.id);
        setProjectName(data.name);
      }
    };
    fetchProject();
  }, [user]);
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

  const handleGoToNextStep = useCallback(() => {
    if (!activeStepId) return;
    const currentIndex = steps.findIndex(s => s.id === activeStepId);
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  }, [activeStepId, steps]);

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
  if (loading || botsLoading) {
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
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Маркетинг план
            </h1>
            <p className="mt-2 text-muted-foreground">
              Създайте и проследявайте вашия бизнес план с AI ботове
            </p>
          </div>
          
          <div className="flex gap-3">
            <GenerateScheduleDialog projectId={projectId || ""} allStepsCompleted={allStepsCompleted} />
            <ExportPdfButton steps={steps} bots={globalBots} projectName={projectName} />
          </div>
        </div>

        {/* Progress */}
        

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Steps List */}
          <div className="lg:col-span-1 space-y-2">
            {steps.map((step, index) => {
            const assignedBot = getBotForStep(step.title);
            // Check if previous steps have content (are unlocked)
            const previousStepsCompleted = index === 0 || steps.slice(0, index).every(s => s.generated_content || s.completed);
            const isLocked = !previousStepsCompleted;
            const isActive = activeStepId === step.id;
            
            return (
              <button 
                key={step.id} 
                onClick={() => !isLocked && setActiveStepId(step.id)} 
                disabled={isLocked} 
                className={cn(
                  "w-full flex items-center gap-4 rounded-2xl p-4 text-left",
                  "transition-all duration-300 ease-out",
                  "border border-transparent",
                  isLocked 
                    ? "opacity-50 cursor-not-allowed bg-secondary/20" 
                    : isActive 
                      ? "bg-card shadow-lg shadow-primary/5 border-primary/20 scale-[1.02]" 
                      : "hover:bg-secondary/60 hover:scale-[1.01] active:scale-[0.99]"
                )}
              >
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl shrink-0 overflow-hidden",
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
                    "font-medium truncate transition-colors duration-200",
                    isLocked ? "text-muted-foreground/60" : step.completed ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  {isLocked ? (
                    <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                      Завършете предишните стъпки
                    </p>
                  ) : assignedBot && (
                    <p className="text-xs text-primary/80 truncate flex items-center gap-1.5 mt-0.5">
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
                      ? "text-primary translate-x-0.5" 
                      : "text-muted-foreground/50 group-hover:translate-x-0.5"
                )} />
              </button>
            );
          })}
          </div>

          {/* Active Step Details */}
          {activeStep && projectId && <PlanStepCard step={activeStep} stepNumber={steps.findIndex(s => s.id === activeStep.id) + 1} isActive={true} bot={getBotForStep(activeStep.title)} projectId={projectId} onSelect={() => {}} onToggleComplete={() => handleToggleComplete(activeStep.id, activeStep.completed)} onContentUpdate={content => updateContent(activeStep.id, content)} onGoToNextStep={handleGoToNextStep} />}
        </div>
      </div>
    </MainLayout>;
}