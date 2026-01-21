import { useState } from "react";
import { Check, Circle, ChevronRight, Bot, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { StepChatInterface } from "./StepChatInterface";
import type { PlanStep, AIBot } from "@/hooks/usePlanSteps";
import ReactMarkdown from "react-markdown";

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'content'>('input');
  const assignedBot = bots.find(b => b.id === step.assigned_bot_id);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await onGenerate();
    setIsGenerating(false);
    setActiveTab('content');
  };

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

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'input' | 'content')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="input" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Въведи информация
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Генерирано съдържание
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="mt-0">
            <StepChatInterface
              step={step}
              projectId={projectId}
              bot={assignedBot || null}
              onContentUpdate={(content) => {
                onContentUpdate(content);
                setActiveTab('content');
              }}
            />
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            {step.generated_content ? (
              <div className="p-4 rounded-lg border bg-card max-h-[500px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Генерирано {assignedBot ? `от ${assignedBot.name}` : 'съдържание'}:
                  </span>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{step.generated_content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-lg border border-dashed text-center">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">
                  Все още няма генерирано съдържание
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !step.assigned_bot_id}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Генерирай с AI
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t flex gap-3 flex-wrap">
          <Button
            variant={step.completed ? "outline" : "default"}
            className={!step.completed ? "gradient-primary" : ""}
            onClick={onToggleComplete}
          >
            {step.completed ? "Отбележи като незавършено" : "Маркирай като завършено"}
          </Button>
          
          {step.generated_content && activeTab === 'content' && (
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
                  Регенерирай
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
