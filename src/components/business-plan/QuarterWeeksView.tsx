import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WeeklyTasksView, WeeklyTask } from "./WeeklyTasksView";
import { ContentPostsSection } from "./ContentPostsSection";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ContentPost {
  id: string;
  business_plan_id: string;
  post_date: string;
  title: string | null;
  description: string | null;
  media_type: "image" | "video";
  media_url: string;
  platform: string | null;
  status: "draft" | "scheduled" | "published";
  created_at: string;
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
  businessPlanId?: string | null;
}

// Weeks per quarter (approximate)
const quarterWeeks: Record<string, number[]> = {
  Q1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  Q2: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  Q3: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
  Q4: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
};

// Get current week number
function getCurrentWeekNumber(): number {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function QuarterWeeksView({
  quarter,
  year,
  goals,
  items,
  weeklyTasks,
  onWeeklyTasksUpdate,
  businessPlanId,
}: QuarterWeeksViewProps) {
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set());
  const [contentPosts, setContentPosts] = useState<Record<number, ContentPost[]>>({});
  const [dbWeeklyTasks, setDbWeeklyTasks] = useState<Record<number, WeeklyTask[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const currentWeek = getCurrentWeekNumber();

  const weeks = quarterWeeks[quarter];

  // Auto-open current week
  useEffect(() => {
    if (weeks.includes(currentWeek)) {
      setOpenWeeks(new Set([currentWeek]));
    }
  }, [currentWeek, weeks]);

  // Fetch weekly tasks from database
  const fetchWeeklyTasks = useCallback(async () => {
    if (!businessPlanId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .select("*")
        .eq("business_plan_id", businessPlanId)
        .in("week_number", weeks);

      if (error) {
        console.error("Error fetching weekly tasks:", error);
        return;
      }

      // Group tasks by week number
      const tasksByWeek: Record<number, WeeklyTask[]> = {};
      (data || []).forEach((task) => {
        if (!tasksByWeek[task.week_number]) {
          tasksByWeek[task.week_number] = [];
        }
        tasksByWeek[task.week_number].push({
          id: task.id,
          title: task.title,
          description: task.description || "",
          priority: (task.priority as "low" | "medium" | "high") || "medium",
          estimatedHours: task.estimated_hours || 1,
          dayOfWeek: task.day_of_week || 1,
          isCompleted: task.is_completed || false,
          taskType: task.task_type as "project" | "strategy" | "action",
        });
      });

      setDbWeeklyTasks(tasksByWeek);
    } catch (error) {
      console.error("Error fetching weekly tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [businessPlanId, weeks]);

  useEffect(() => {
    fetchWeeklyTasks();
  }, [fetchWeeklyTasks]);

  // Fetch content posts for all weeks in this quarter
  useEffect(() => {
    if (!businessPlanId) return;

    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("content_posts")
        .select("*")
        .eq("business_plan_id", businessPlanId);

      if (error) {
        console.error("Error fetching content posts:", error);
        return;
      }

      // Group posts by week number
      const postsByWeek: Record<number, ContentPost[]> = {};
      (data || []).forEach((post) => {
        const postDate = new Date(post.post_date);
        const weekNum = getWeekNumber(postDate);
        if (!postsByWeek[weekNum]) {
          postsByWeek[weekNum] = [];
        }
        postsByWeek[weekNum].push(post as ContentPost);
      });

      setContentPosts(postsByWeek);
    };

    fetchPosts();
  }, [businessPlanId]);

  // Get ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

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
    // Merge local weeklyTasks with dbWeeklyTasks
    const localTasks = weeklyTasks[weekNumber] || [];
    const dbTasks = dbWeeklyTasks[weekNumber] || [];
    
    // Use dbTasks if available, otherwise fall back to local
    const tasks = dbTasks.length > 0 ? dbTasks : localTasks;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const total = tasks.length;
    const postsCount = (contentPosts[weekNumber] || []).length;
    return { completed, total, postsCount };
  };

  const handlePostsUpdate = (weekNumber: number, posts: ContentPost[]) => {
    setContentPosts((prev) => ({
      ...prev,
      [weekNumber]: posts,
    }));
  };

  // Get combined tasks for a week
  const getTasksForWeek = (weekNumber: number): WeeklyTask[] => {
    const dbTasks = dbWeeklyTasks[weekNumber] || [];
    const localTasks = weeklyTasks[weekNumber] || [];
    return dbTasks.length > 0 ? dbTasks : localTasks;
  };

  const ensureTaskIds = (tasks: WeeklyTask[]): WeeklyTask[] => {
    let changed = false;
    const normalized = tasks.map((t) => {
      if (t.id) return t;
      changed = true;
      return { ...t, id: crypto.randomUUID() };
    });
    return changed ? normalized : tasks;
  };

  return (
    <Card>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Седмици в {quarter}</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchWeeklyTasks}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Обнови
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {weeks.map((weekNumber) => {
          const isOpen = openWeeks.has(weekNumber);
          const stats = getWeekStats(weekNumber);
          const hasProgress = stats.total > 0;
          const isCurrentWeek = weekNumber === currentWeek;

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
                    isOpen && "bg-muted",
                    isCurrentWeek && "ring-2 ring-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">Седмица {weekNumber}</span>
                    {isCurrentWeek && (
                      <Badge variant="default" className="text-xs">
                        Текуща
                      </Badge>
                    )}
                    {stats.postsCount > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {stats.postsCount} {stats.postsCount === 1 ? "пост" : "поста"}
                      </span>
                    )}
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
                  tasks={getTasksForWeek(weekNumber)}
                  onTasksUpdate={async (tasks) => {
                    const normalizedTasks = ensureTaskIds(tasks);

                    // Update local state immediately
                    onWeeklyTasksUpdate(weekNumber, normalizedTasks);
                    setDbWeeklyTasks(prev => ({
                      ...prev,
                      [weekNumber]: normalizedTasks,
                    }));
                    
                    // Sync new/updated tasks to database
                    if (businessPlanId) {
                      try {
                        // Get current tasks from DB for this week
                        const { data: existingTasks } = await supabase
                          .from("weekly_tasks")
                          .select("id")
                          .eq("business_plan_id", businessPlanId)
                          .eq("week_number", weekNumber);
                        
                        const existingIds = new Set((existingTasks || []).map(t => t.id));
                        const newTaskIds = new Set(normalizedTasks.map(t => t.id).filter(Boolean));

                        // Safety: avoid accidental full wipe if tasks are temporarily empty
                        if (normalizedTasks.length === 0 && existingIds.size > 0) {
                          console.warn(
                            "Skipping weekly_tasks delete sync to avoid wiping existing tasks. week:",
                            weekNumber
                          );
                          return;
                        }
                        
                        // Delete removed tasks
                        const toDelete = [...existingIds].filter(id => !newTaskIds.has(id));
                        if (toDelete.length > 0) {
                          await supabase
                            .from("weekly_tasks")
                            .delete()
                            .in("id", toDelete);
                        }
                        
                        // Upsert all current tasks
                        const tasksToUpsert = normalizedTasks.map(task => ({
                          id: task.id,
                          business_plan_id: businessPlanId,
                          week_number: weekNumber,
                          title: task.title,
                          description: task.description,
                          priority: task.priority,
                          estimated_hours: task.estimatedHours,
                          day_of_week: task.dayOfWeek,
                          is_completed: task.isCompleted,
                          task_type: task.taskType || "action",
                        }));
                        
                        if (tasksToUpsert.length > 0) {
                          const { error } = await supabase
                            .from("weekly_tasks")
                            .upsert(tasksToUpsert, { onConflict: "id" });
                          
                          if (error) {
                            console.error("Error syncing tasks:", error);
                          }
                        }
                      } catch (error) {
                        console.error("Error syncing tasks to database:", error);
                      }
                    }
                  }}
                />
                <ContentPostsSection
                  businessPlanId={businessPlanId || null}
                  weekNumber={weekNumber}
                  year={year}
                  posts={contentPosts[weekNumber] || []}
                  onPostsUpdate={(posts) => handlePostsUpdate(weekNumber, posts)}
                />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
