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
    <div className="lg:col-span-2">
      <Card className="p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={cn(
              "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
              step.completed
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary"
            )}>
              {step.completed ? (
                <>
                  <Check className="h-4 w-4" />
                  Завършено
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4" />
                  В процес
                </>
              )}
            </span>
            <h2 className="mt-4 text-2xl font-display font-bold text-foreground">
              {step.title}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {step.description}
            </p>
          </div>
        </div>

        {/* Bot Assignment */}
        <div className="mb-4 p-3 rounded-lg bg-secondary/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">AI Бот:</span>
          </div>
          <Select
            value={step.assigned_bot_id || "none"}
            onValueChange={(value) => onAssignBot(value === "none" ? null : value)}
          >
            <SelectTrigger className="w-[200px]">
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

        {/* Chat Interface only */}
        <StepChatInterface
          step={step}
          projectId={projectId}
          bot={assignedBot || null}
          onContentUpdate={onContentUpdate}
        />

        <div className="mt-4 pt-4 border-t">
          <Button
            variant={step.completed ? "outline" : "default"}
            className={!step.completed ? "gradient-primary" : ""}
            onClick={onToggleComplete}
          >
            {step.completed ? "Отбележи като незавършено" : "Маркирай като завършено"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
