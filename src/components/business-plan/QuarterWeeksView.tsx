import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WeeklyTasksView } from "./WeeklyTasksView";
import { cn } from "@/lib/utils";

interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  isCompleted: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: string;
}

interface PlanItem {
  id: string;
  type: "project" | "strategy" | "action";
  title: string;
  description: string;
  owner: string;
  deadline: string;
  expectedResults: string;
  status: string;
  priority: "high" | "medium" | "low";
}

interface QuarterWeeksViewProps {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  year: number;
  goals: Goal[];
  items: PlanItem[];
  weeklyTasks: Record<number, WeeklyTask[]>;
  onWeeklyTasksUpdate: (weekNumber: number, tasks: WeeklyTask[]) => void;
}

// Weeks per quarter (approximate)
const quarterWeeks: Record<string, number[]> = {
  Q1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  Q2: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  Q3: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
  Q4: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
};

export function QuarterWeeksView({
  quarter,
  year,
  goals,
  items,
  weeklyTasks,
  onWeeklyTasksUpdate,
}: QuarterWeeksViewProps) {
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set());

  const weeks = quarterWeeks[quarter];

  const toggleWeek = (weekNumber: number) => {
    const newOpenWeeks = new Set(openWeeks);
    if (newOpenWeeks.has(weekNumber)) {
      newOpenWeeks.delete(weekNumber);
    } else {
      newOpenWeeks.add(weekNumber);
    }
    setOpenWeeks(newOpenWeeks);
  };

  const getWeekStats = (weekNumber: number) => {
    const tasks = weeklyTasks[weekNumber] || [];
    const completed = tasks.filter((t) => t.isCompleted).length;
    const total = tasks.length;
    return { completed, total };
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Седмици в {quarter}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {weeks.map((weekNumber) => {
          const isOpen = openWeeks.has(weekNumber);
          const stats = getWeekStats(weekNumber);
          const hasProgress = stats.total > 0;

          return (
            <Collapsible
              key={weekNumber}
              open={isOpen}
              onOpenChange={() => toggleWeek(weekNumber)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between h-auto py-3 px-4",
                    isOpen && "bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">Седмица {weekNumber}</span>
                  </div>
                  {hasProgress && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${(stats.completed / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {stats.completed}/{stats.total}
                      </span>
                    </div>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-2">
                <WeeklyTasksView
                  weekNumber={weekNumber}
                  quarter={quarter}
                  year={year}
                  goals={goals}
                  items={items}
                  tasks={weeklyTasks[weekNumber] || []}
                  onTasksUpdate={(tasks) => onWeeklyTasksUpdate(weekNumber, tasks)}
                />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
