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
      "rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:bg-secondary/50",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs",
              trend.positive ? "text-muted-foreground" : "text-destructive"
            )}>
              {trend.positive ? "+" : "-"}{Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </div>
  );
}
