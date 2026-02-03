import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ArrowRight, Loader2, CheckCircle2, Target, Calendar, Sparkles, MessageSquare, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoalsEditChat } from "./GoalsEditChat";

interface PlanStep {
  id: string;
  title: string;
  step_order: number;
  generated_content: string | null;
}

interface EditableGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface SyncPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: PlanStep[];
  onConfirm: (editedGoals?: EditableGoal[]) => Promise<void>;
}

function getCategoryLabel(title: string): { label: string; color: string } {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("финанс")) return { label: "Приходи", color: "bg-emerald-500/10 text-emerald-600" };
  if (titleLower.includes("пазар")) return { label: "Растеж", color: "bg-blue-500/10 text-blue-600" };
  if (titleLower.includes("маркетинг") || titleLower.includes("контент")) return { label: "Растеж", color: "bg-blue-500/10 text-blue-600" };
  if (titleLower.includes("оператив")) return { label: "Ефективност", color: "bg-amber-500/10 text-amber-600" };
  if (titleLower.includes("резюме")) return { label: "Обзор", color: "bg-purple-500/10 text-purple-600" };
  return { label: "Друго", color: "bg-muted text-muted-foreground" };
}

function getCategoryFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("финанс")) return "revenue";
  if (titleLower.includes("пазар")) return "growth";
  if (titleLower.includes("маркетинг") || titleLower.includes("контент")) return "growth";
  if (titleLower.includes("оператив")) return "efficiency";
  if (titleLower.includes("резюме")) return "other";
  return "other";
}

function extractPreview(content: string | null): string {
  if (!content) return "Няма съдържание";
  
  // Try to extract key points
  const keyPointsMatch = content.match(/## Ключови точки.*?:([\s\S]*?)(?:##|$)/);
  if (keyPointsMatch) {
    return keyPointsMatch[1].trim().substring(0, 200) + "...";
  }
  
  // Fallback to first paragraph
  const firstParagraph = content.split("\n\n")[0];
  return (firstParagraph?.substring(0, 200) || "Няма съдържание") + "...";
}

export function SyncPreviewDialog({
  open,
  onOpenChange,
  steps,
  onConfirm,
}: SyncPreviewDialogProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };
  const stepsWithContent = useMemo(() => 
    steps
      .filter(s => s.generated_content)
      .sort((a, b) => a.step_order - b.step_order),
    [steps]
  );

  // Create editable goals from steps
  const [editableGoals, setEditableGoals] = useState<EditableGoal[]>(() => 
    stepsWithContent.map((step, index) => ({
      id: `goal-${Date.now()}-${index}`,
      title: step.title,
      description: step.generated_content?.substring(0, 500) || "",
      category: getCategoryFromTitle(step.title),
      priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
    }))
  );

  // Update editable goals when steps change
  useMemo(() => {
    if (stepsWithContent.length > 0 && editableGoals.length === 0) {
      setEditableGoals(
        stepsWithContent.map((step, index) => ({
          id: `goal-${Date.now()}-${index}`,
          title: step.title,
          description: step.generated_content?.substring(0, 500) || "",
          category: getCategoryFromTitle(step.title),
          priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
        }))
      );
    }
  }, [stepsWithContent, editableGoals.length]);

  const handleConfirm = async () => {
    setIsSyncing(true);
    try {
      await onConfirm(editableGoals);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate how many weekly strategies will be generated
  const weeksPerQuarter = 13;
  const totalWeeks = 52;

  const categoryLabels: Record<string, string> = {
    revenue: "Приходи",
    growth: "Растеж",
    efficiency: "Ефективност",
    innovation: "Иновации",
    other: "Друго",
  };

  const priorityLabels: Record<string, string> = {
    high: "Висок",
    medium: "Среден",
    low: "Нисък",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Преглед на данните за прехвърляне
          </DialogTitle>
          <DialogDescription>
            Маркетинг планът ще генерира <strong>{totalWeeks} седмични стратегии</strong>. Можете да редактирате целите с AI помощник.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Преглед ({editableGoals.length} цели)
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Редактирай с AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-[45vh] pr-4">
              <div className="space-y-4">
                {/* Editable Goals Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Годишни цели ({editableGoals.length})
                  </div>
                  
                  {editableGoals.map((goal, index) => {
                    const isExpanded = expandedGoals.has(goal.id);
                    const hasLongDescription = (goal.description?.length || 0) > 100;
                    
                    return (
                      <div
                        key={goal.id}
                        className={cn(
                          "rounded-xl border border-border/50 p-4 space-y-2",
                          "bg-card/50 transition-colors hover:bg-card"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold shrink-0">
                              {index + 1}
                            </span>
                            <h4 className="font-medium text-sm">{goal.title}</h4>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="secondary" className={cn("text-xs", 
                              goal.priority === "high" ? "bg-destructive/10 text-destructive" :
                              goal.priority === "medium" ? "bg-warning/10 text-warning" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {priorityLabels[goal.priority] || goal.priority}
                            </Badge>
                            <Badge variant="secondary" className="text-xs bg-secondary">
                              {categoryLabels[goal.category] || goal.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="pl-8">
                          <p className={cn(
                            "text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap",
                            !isExpanded && hasLongDescription && "line-clamp-2"
                          )}>
                            {goal.description || "Няма описание"}
                          </p>
                          {hasLongDescription && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleGoalExpanded(goal.id)}
                              className="h-6 px-2 mt-1 text-xs text-primary hover:text-primary/80"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Скрий
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Покажи повече
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {editableGoals.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Няма цели за показване</p>
                    </div>
                  )}
                </div>

                {/* Weekly Strategies Generation Info */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Автоматично генерирани седмични стратегии
                  </div>
                  
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm text-foreground mb-3">
                      Въз основа на целите ще бъдат създадени <strong>{totalWeeks} седмични стратегии</strong> с:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Различен маркетинг фокус за всяка седмица
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Конкретни тактики: Социални мрежи, Имейл, Реклами, SEO
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Интегриране на съдържанието от всички стъпки на плана
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Quarterly Distribution */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Разпределение по тримесечия
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(quarter => (
                      <div
                        key={quarter}
                        className="rounded-xl border border-border/50 p-3 bg-card/30 text-center"
                      >
                        <div className="text-xs font-semibold text-primary mb-1">Q{quarter}</div>
                        <div className="text-lg font-bold text-foreground">{weeksPerQuarter}</div>
                        <div className="text-[10px] text-muted-foreground">
                          седмици
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 min-h-0 mt-0">
            <div className="h-[45vh]">
              <GoalsEditChat 
                goals={editableGoals} 
                onGoalsUpdate={setEditableGoals} 
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
            className="rounded-xl"
          >
            Отказ
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSyncing || editableGoals.length === 0}
            className="rounded-xl gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Генериране на {totalWeeks} седмици...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Генерирай седмични стратегии
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
