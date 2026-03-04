import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-xl md:rounded-2xl border border-border bg-card p-3 md:p-5 transition-all duration-200 hover:bg-secondary/50",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-full bg-secondary shrink-0">
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-lg md:text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
