import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, ArrowRight, FileText, Sparkles } from "lucide-react";

interface WebsiteOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateWebsite: () => void;
  onGoToBusinessPlan: () => void;
}

export function WebsiteOfferDialog({
  open,
  onOpenChange,
  onGenerateWebsite,
  onGoToBusinessPlan,
}: WebsiteOfferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            Планът ви е готов!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Искате ли да генерираме уебсайт за вашия бизнес на базата на маркетинг плана?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <button
            onClick={onGenerateWebsite}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Генерирай уебсайт</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI ще създаде сайт с вашето послание, CTA и дизайн
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <button
            onClick={onGoToBusinessPlan}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Към бизнес плана</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Прегледайте 52-те седмични стратегии
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs text-muted-foreground"
          >
            Затвори
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
