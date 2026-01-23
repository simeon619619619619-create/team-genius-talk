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
  revenue_model: "Бизнес модел",
  main_goal: "Основна цел",
  competitors: "Конкуренти",
  buying_behavior: "Поведение на купувачите",
  alternatives: "Алтернативи",
  market_prices: "Пазарни цени",
  entry_barriers: "Бариери за влизане",
  positioning: "Позициониране",
  channels: "Маркетинг канали",
  main_message: "Основно послание",
  lead_mechanism: "Lead механизъм",
  cta: "Call to Action",
  daily_weekly_tasks: "Дневни/седмични задачи",
  who_does_it: "Изпълнители",
  resources_needed: "Ресурси",
  priorities: "Приоритети",
  first_30_days: "План 30 дни",
  main_costs: "Разходи",
  main_revenue: "Приходи",
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

  const getMissingFieldsText = () => {
    if (missingFields.length === 0) return "";
    const labels = missingFields.map(f => fieldLabels[f] || f);
    return `Липсващи отговори: ${labels.join(", ")}`;
  };

  return (
    <div className="lg:col-span-2 flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Main Card - takes all space except button */}
      <Card className="p-4 flex flex-col flex-1 min-h-0 overflow-hidden rounded-3xl border-border/50 shadow-xl shadow-black/5 transition-shadow duration-300">
        {/* Combined Header with Mark Complete Button */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              "transition-all duration-300 ease-out",
              step.completed
                ? "bg-success/15 text-success"
                : "bg-primary/10 text-primary"
            )}>
              {step.completed ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Завършено
                </>
              ) : (
                <>
                  <Circle className="h-3.5 w-3.5" />
                  В процес
                </>
              )}
            </span>
            <h2 className="text-lg font-display font-bold text-foreground">
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
                      "shrink-0 rounded-xl transition-all duration-300 ease-out font-medium",
                      !step.completed && canComplete && "bg-success hover:bg-success/90 text-success-foreground shadow-md shadow-success/25 hover:shadow-lg hover:shadow-success/30 hover:scale-105 active:scale-95",
                      !step.completed && !canComplete && "bg-muted/60 text-muted-foreground/60 dark:bg-muted/40 dark:text-muted-foreground/50 cursor-not-allowed border border-border/30 dark:border-border/20",
                      step.completed && "border-success/30 text-success hover:bg-success/10 dark:border-success/20 dark:hover:bg-success/15"
                    )}
                    onClick={handleToggleComplete}
                    disabled={!step.completed && !canComplete}
                  >
                    {step.completed ? (
                      <>
                        <Circle className="h-4 w-4 mr-1.5" />
                        Върни
                      </>
                    ) : !canComplete ? (
                      <>
                        <Lock className="h-4 w-4 mr-1.5" />
                        Завърши
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1.5" />
                        Завърши
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

        {/* Progress indicator for missing fields */}
        {!step.completed && missingFields.length > 0 && (
          <div className={cn(
            "flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs",
            "bg-warning/10 text-warning border border-warning/20",
            "animate-fade-in transition-all duration-300"
          )}>
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Отговорете на {missingFields.length} {missingFields.length === 1 ? 'въпрос' : 'въпроса'} за да завършите стъпката
            </span>
          </div>
        )}

        {/* Chat Interface - takes ALL remaining space in card */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
          <StepChatInterface
            step={step}
            projectId={projectId}
            bot={bot}
            onContentUpdate={onContentUpdate}
            onCompletionStatusChange={handleCompletionStatusChange}
          />
        </div>
      </Card>
    </div>
  );
}
