import { useState, useCallback } from "react";
import { Check, Circle, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StepChatInterface } from "./StepChatInterface";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PlanStep } from "@/hooks/usePlanSteps";
import type { GlobalBot } from "@/hooks/useGlobalBots";

interface PlanStepCardProps {
  step: PlanStep;
  stepNumber: number;
  isActive: boolean;
  bot: GlobalBot | null;
  projectId: string;
  onSelect: () => void;
  onToggleComplete: () => void;
  onContentUpdate: (content: string) => void;
  onGoToNextStep?: () => void;
}

// Map field keys to human-readable Bulgarian labels
const fieldLabels: Record<string, string> = {
  business_type: "Тип бизнес",
  target_audience: "Целева аудитория",
  problem_solved: "Решаван проблем",
  team_size: "Размер на екипа",
  hours_per_day: "Часове на ден",
  preferred_work_hours: "Предпочитани часове",
  revenue_model: "Бизнес модел",
  main_goal: "Основна цел",
  competitors: "Конкуренти",
  buying_behavior: "Поведение на купувачите",
  alternatives: "Алтернативи",
  market_prices: "Пазарни цени",
  entry_barriers: "Бариери за влизане",
  positioning: "Позициониране",
  marketing_channels: "Маркетинг канали",
  sales_channels: "Продажбени канали",
  main_message: "Основно послание",
  lead_mechanism: "Lead механизъм",
  cta: "Call to Action",
  monthly_goals_1: "Цели за месец 1",
  monthly_goals_3: "Цели за 3 месеца",
  weekly_activities: "Седмични дейности",
  who_does_it: "Изпълнители",
  resources_needed: "Ресурси",
  priorities: "Приоритети",
  main_costs: "Разходи",
  main_revenue: "Приходи",
  marketing_budget: "Маркетинг бюджет",
  cac: "CAC",
  break_even: "Break-even",
  scenarios: "Сценарии",
};

export function PlanStepCard({
  step,
  stepNumber,
  isActive,
  bot,
  projectId,
  onSelect,
  onToggleComplete,
  onContentUpdate,
  onGoToNextStep,
}: PlanStepCardProps) {
  const [canComplete, setCanComplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const handleCompletionStatusChange = useCallback((canCompleteNow: boolean, missing: string[]) => {
    setCanComplete(canCompleteNow);
    setMissingFields(missing);
  }, []);

  const handleToggleComplete = () => {
    // If already completed, allow uncompleting
    if (step.completed) {
      onToggleComplete();
      return;
    }
    
    // Only allow completing if all required fields are answered
    if (canComplete) {
      onToggleComplete();
      // Navigate to the next step after completing
      if (onGoToNextStep) {
        setTimeout(() => {
          onGoToNextStep();
        }, 500); // Small delay for confetti animation
      }
    }
  };

  // Combined handler: mark as complete AND go to next step
  const handleCompleteAndGoNext = useCallback(() => {
    if (!step.completed && canComplete) {
      onToggleComplete();
      // Navigate after confetti animation
      if (onGoToNextStep) {
        setTimeout(() => {
          onGoToNextStep();
        }, 500);
      }
    }
  }, [step.completed, canComplete, onToggleComplete, onGoToNextStep]);

  const getMissingFieldsText = () => {
    if (missingFields.length === 0) return "";
    const labels = missingFields.map(f => fieldLabels[f] || f);
    return `Липсващи отговори: ${labels.join(", ")}`;
  };

  return (
    <div className="lg:col-span-2 flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Main Card - takes all space except button */}
      <Card className="p-3 md:p-4 flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl md:rounded-3xl border-border/50 shadow-xl shadow-black/5 transition-shadow duration-300">
        {/* Combined Header with Mark Complete Button */}
        <div className="flex items-center justify-between mb-2 md:mb-3 flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium shrink-0",
              "transition-all duration-300 ease-out",
              step.completed
                ? "bg-success/15 text-success"
                : "bg-primary/10 text-primary"
            )}>
              {step.completed ? (
                <>
                  <Check className="h-3 w-3" />
                  <span className="hidden sm:inline">Завършено</span>
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3" />
                  <span className="hidden sm:inline">В процес</span>
                </>
              )}
            </span>
            <h2 className="text-base md:text-lg font-display font-bold text-foreground truncate">
              {step.title}
            </h2>
          </div>
          
          {/* Mark Complete Button - with intelligent protection */}
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    size="sm"
                    variant={step.completed ? "outline" : "secondary"}
                    className={cn(
                      "shrink-0 rounded-xl transition-all duration-300 ease-out font-medium text-xs md:text-sm h-8 md:h-9 px-2 md:px-3",
                      !step.completed && canComplete && "bg-success hover:bg-success/90 text-success-foreground shadow-md shadow-success/25",
                      !step.completed && !canComplete && "bg-muted/60 text-muted-foreground/60 cursor-not-allowed border border-border/30",
                      step.completed && "border-success/30 text-success hover:bg-success/10"
                    )}
                    onClick={handleToggleComplete}
                    disabled={!step.completed && !canComplete}
                  >
                    {step.completed ? (
                      <>
                        <Circle className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Върни</span>
                      </>
                    ) : !canComplete ? (
                      <>
                        <Lock className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Завърши</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Завърши</span>
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {!step.completed && !canComplete && missingFields.length > 0 && (
                <TooltipContent side="bottom" className="max-w-xs rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Отговорете на всички въпроси</p>
                      <p className="text-muted-foreground text-xs">{getMissingFieldsText()}</p>
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Progress indicator for missing fields - Compact on mobile */}
        {!step.completed && missingFields.length > 0 && (
          <div className={cn(
            "flex items-center gap-2 mb-2 md:mb-3 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs",
            "bg-warning/10 text-warning border border-warning/20",
            "animate-fade-in transition-all duration-300"
          )}>
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>
              Отговорете на {missingFields.length} {missingFields.length === 1 ? 'въпрос' : 'въпроса'} за да завършите стъпката
            </span>
          </div>
        )}

        {/* Chat Interface - takes ALL remaining space in card */}
        <div className="flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden">
          <StepChatInterface
            step={step}
            projectId={projectId}
            bot={bot}
            onContentUpdate={onContentUpdate}
            onCompletionStatusChange={handleCompletionStatusChange}
            onGoToNextStep={onGoToNextStep}
            onCompleteAndGoNext={handleCompleteAndGoNext}
          />
        </div>
      </Card>
    </div>
  );
}
