import { useState } from "react";
import { Check, Circle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StepChatInterface } from "./StepChatInterface";
import type { PlanStep, AIBot } from "@/hooks/usePlanSteps";

interface PlanStepCardProps {
  step: PlanStep;
  stepNumber: number;
  isActive: boolean;
  bots: AIBot[];
  projectId: string;
  onSelect: () => void;
  onToggleComplete: () => void;
  onAssignBot: (botId: string | null) => void;
  onGenerate: () => Promise<string | null>;
  onContentUpdate: (content: string) => void;
}

export function PlanStepCard({
  step,
  stepNumber,
  isActive,
  bots,
  projectId,
  onSelect,
  onToggleComplete,
  onAssignBot,
  onGenerate,
  onContentUpdate,
}: PlanStepCardProps) {
  const assignedBot = bots.find(b => b.id === step.assigned_bot_id);

  return (
    <div className="lg:col-span-2 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Main Card - takes all space except button */}
      <Card className="p-3 animate-fade-in flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Combined Header with Bot Assignment */}
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
          
          {/* Bot selector on the right */}
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <Select
              value={step.assigned_bot_id || "none"}
              onValueChange={(value) => onAssignBot(value === "none" ? null : value)}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Избери бот..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без бот</SelectItem>
                {bots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>
                    {bot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chat Interface - takes ALL remaining space in card */}
        <div className="flex-1 min-h-0">
          <StepChatInterface
            step={step}
            projectId={projectId}
            bot={assignedBot || null}
            onContentUpdate={onContentUpdate}
          />
        </div>
      </Card>

      {/* Footer button - OUTSIDE the card */}
      <div className="pt-3 flex-shrink-0">
        <Button
          variant={step.completed ? "outline" : "default"}
          className={!step.completed ? "gradient-primary" : ""}
          onClick={onToggleComplete}
        >
          {step.completed ? "Отбележи като незавършено" : "Маркирай като завършено"}
        </Button>
      </div>
    </div>
  );
}
