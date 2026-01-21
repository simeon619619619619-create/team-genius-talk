import { useState } from "react";
import { Check, Circle, ChevronRight, Bot, Loader2, Sparkles } from "lucide-react";
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
import type { PlanStep, AIBot } from "@/hooks/usePlanSteps";
import ReactMarkdown from "react-markdown";

interface PlanStepCardProps {
  step: PlanStep;
  stepNumber: number;
  isActive: boolean;
  bots: AIBot[];
  onSelect: () => void;
  onToggleComplete: () => void;
  onAssignBot: (botId: string | null) => void;
  onGenerate: () => Promise<string | null>;
}

export function PlanStepCard({
  step,
  stepNumber,
  isActive,
  bots,
  onSelect,
  onToggleComplete,
  onAssignBot,
  onGenerate,
}: PlanStepCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const assignedBot = bots.find(b => b.id === step.assigned_bot_id);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await onGenerate();
    setIsGenerating(false);
  };

  return (
    <div className="lg:col-span-2">
      <Card className="p-8 animate-fade-in">
        <div className="flex items-start justify-between">
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
        <div className="mt-6 p-4 rounded-lg bg-secondary/50">
          <div className="flex items-center justify-between gap-4">
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
          
          {assignedBot && (
            <p className="mt-2 text-xs text-muted-foreground">
              Модел: {assignedBot.model.replace('google/', '')}
            </p>
          )}
        </div>

        {/* Generated Content */}
        {step.generated_content && (
          <div className="mt-6 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Генерирано от {assignedBot?.name || 'AI'}:
              </span>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{step.generated_content}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3 flex-wrap">
          <Button
            variant={step.completed ? "outline" : "default"}
            className={!step.completed ? "gradient-primary" : ""}
            onClick={onToggleComplete}
          >
            {step.completed ? "Отбележи като незавършено" : "Маркирай като завършено"}
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleGenerate}
            disabled={isGenerating || !step.assigned_bot_id}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Генериране...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Генерирай с AI
              </>
            )}
          </Button>
        </div>

        {!step.assigned_bot_id && (
          <p className="mt-3 text-xs text-muted-foreground">
            За да генерирате съдържание, първо изберете AI бот от списъка по-горе.
          </p>
        )}
      </Card>
    </div>
  );
}
