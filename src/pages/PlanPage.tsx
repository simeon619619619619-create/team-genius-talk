import { useState, useEffect } from "react";
import { Check, ChevronRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { BotConfigDialog } from "@/components/plan/BotConfigDialog";
import { PlanStepCard } from "@/components/plan/PlanStepCard";
import { usePlanSteps } from "@/hooks/usePlanSteps";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanPage() {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  // Fetch user's project
  useEffect(() => {
    const fetchProject = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();
      
      if (!error && data) {
        setProjectId(data.id);
      }
    };
    
    fetchProject();
  }, [user]);

  const {
    steps,
    bots,
    loading,
    toggleStepComplete,
    assignBotToStep,
    createBot,
    updateBot,
    deleteBot,
    generateContent,
  } = usePlanSteps(projectId);

  // Set active step when steps load
  useEffect(() => {
    if (steps.length > 0 && !activeStepId) {
      const firstIncomplete = steps.find(s => !s.completed);
      setActiveStepId(firstIncomplete?.id || steps[0].id);
    }
  }, [steps, activeStepId]);

  const completedCount = steps.filter(s => s.completed).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const activeStep = steps.find(s => s.id === activeStepId);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="lg:col-span-2 h-96" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
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
          
          {projectId && (
            <BotConfigDialog
              bots={bots}
              projectId={projectId}
              onCreateBot={createBot}
              onUpdateBot={updateBot}
              onDeleteBot={deleteBot}
            />
          )}
        </div>

        {/* Progress */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground">
              Прогрес на плана
            </h2>
            <span className="text-sm text-muted-foreground">
              {completedCount} от {steps.length} завършени
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Steps List */}
          <div className="lg:col-span-1 space-y-3">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className={cn(
                  "w-full flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-200",
                  activeStepId === step.id
                    ? "glass-card shadow-lg"
                    : "hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
                  step.completed
                    ? "bg-success text-success-foreground"
                    : activeStepId === step.id
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {step.completed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    step.completed && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {step.assigned_bot_id && (
                    <p className="text-xs text-primary truncate">
                      {bots.find(b => b.id === step.assigned_bot_id)?.name}
                    </p>
                  )}
                </div>
                <ChevronRight className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  activeStepId === step.id ? "text-primary" : "text-muted-foreground"
                )} />
              </button>
            ))}
          </div>

          {/* Active Step Details */}
          {activeStep && (
            <PlanStepCard
              step={activeStep}
              stepNumber={steps.findIndex(s => s.id === activeStep.id) + 1}
              isActive={true}
              bots={bots}
              onSelect={() => {}}
              onToggleComplete={() => toggleStepComplete(activeStep.id)}
              onAssignBot={(botId) => assignBotToStep(activeStep.id, botId)}
              onGenerate={() => generateContent(activeStep.id)}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
