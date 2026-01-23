import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StepChatInterface } from "./StepChatInterface";
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
}

export function PlanStepCard({
  step,
  stepNumber,
  isActive,
  bot,
  projectId,
  onSelect,
  onToggleComplete,
  onContentUpdate,
}: PlanStepCardProps) {

  return (
    <div className="lg:col-span-2 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Main Card - takes all space except button */}
      <Card className="p-3 animate-fade-in flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Combined Header with Mark Complete Button */}
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              step.completed
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary"
            )}>
              {step.completed ? (
                <>
                  <Check className="h-3 w-3" />
                  Завършено
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3" />
                  В процес
                </>
              )}
            </span>
            <h2 className="text-lg font-display font-bold text-foreground">
              {step.title}
            </h2>
          </div>
          
          {/* Mark Complete Button - Easy to access in header */}
          <Button
            size="sm"
            variant={step.completed ? "outline" : "default"}
            className={cn(
              "shrink-0",
              !step.completed && "gradient-primary"
            )}
            onClick={onToggleComplete}
          >
            {step.completed ? (
              <>
                <Circle className="h-4 w-4 mr-1" />
                Върни
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Завърши
              </>
            )}
          </Button>
        </div>

        {/* Chat Interface - takes ALL remaining space in card */}
        <div className="flex-1 min-h-0">
          <StepChatInterface
            step={step}
            projectId={projectId}
            bot={bot}
            onContentUpdate={onContentUpdate}
          />
        </div>
      </Card>
    </div>
  );
}
