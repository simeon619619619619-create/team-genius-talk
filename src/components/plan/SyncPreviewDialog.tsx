import { useState } from "react";
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
import { FileText, ArrowRight, Loader2, CheckCircle2, Target, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanStep {
  id: string;
  title: string;
  step_order: number;
  generated_content: string | null;
}

interface SyncPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: PlanStep[];
  onConfirm: () => Promise<void>;
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

  const stepsWithContent = steps
    .filter(s => s.generated_content)
    .sort((a, b) => a.step_order - b.step_order);

  const handleConfirm = async () => {
    setIsSyncing(true);
    try {
      await onConfirm();
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate how many weekly strategies will be generated
  const weeksPerQuarter = 13;
  const totalWeeks = 52;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Преглед на данните за прехвърляне
          </DialogTitle>
          <DialogDescription>
            Маркетинг планът ще генерира <strong>{totalWeeks} седмични стратегии</strong> за цялата година.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] pr-4">
          <div className="space-y-4">
            {/* Annual Goals Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Годишни цели от маркетинг плана ({stepsWithContent.length})
              </div>
              
              {stepsWithContent.map((step, index) => {
                const category = getCategoryLabel(step.title);
                return (
                  <div
                    key={step.id}
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
                        <h4 className="font-medium text-sm truncate">{step.title}</h4>
                      </div>
                      <Badge variant="secondary" className={cn("shrink-0 text-xs", category.color)}>
                        {category.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                      {extractPreview(step.generated_content)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Weekly Strategies Generation Info */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Автоматично генерирани седмични стратегии
              </div>
              
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-foreground mb-3">
                  Въз основа на маркетинг плана ще бъдат създадени <strong>{totalWeeks} седмични стратегии</strong> с:
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

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
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
            disabled={isSyncing || stepsWithContent.length === 0}
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
