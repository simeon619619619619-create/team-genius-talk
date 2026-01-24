import { useState, useEffect } from "react";
import { Calendar, Clock, CheckCircle2, ArrowRight, Sparkles, Target, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface DailyTask {
  id: string;
  title: string;
  description?: string;
  timeSlot?: string;
  priority: "low" | "medium" | "high";
  taskType?: string;
  isCompleted: boolean;
}

interface NextStep {
  stepTitle: string;
  stepNumber: number;
  missingFields: string[];
}

const priorityColors = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const taskTypeLabels: Record<string, string> = {
  marketing: "Маркетинг",
  sales: "Продажби",
  content: "Съдържание",
  admin: "Админ",
  meeting: "Среща",
};

export function DailyPlanWidget() {
  const { user } = useAuth();
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [nextStep, setNextStep] = useState<NextStep | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Добро утро");
    else if (hour < 18) setGreeting("Добър ден");
    else setGreeting("Добър вечер");
  }, []);

  useEffect(() => {
    const fetchDailyData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch user's project
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!project) {
          setIsLoading(false);
          return;
        }

        // Fetch incomplete plan steps to determine next step
        const { data: steps } = await supabase
          .from('plan_steps')
          .select('id, title, step_order, completed')
          .eq('project_id', project.id)
          .order('step_order');

        if (steps) {
          const incompleteStep = steps.find(s => !s.completed);
          if (incompleteStep) {
            // Fetch answers for this step to see what's missing
            const { data: answers } = await supabase
              .from('step_answers')
              .select('question_key')
              .eq('step_id', incompleteStep.id);

            const answeredKeys = answers?.map(a => a.question_key) || [];
            
            setNextStep({
              stepTitle: incompleteStep.title,
              stepNumber: incompleteStep.step_order,
              missingFields: [], // Simplified for now
            });
          }
        }

        // Fetch today's tasks from weekly_tasks
        const today = new Date();
        const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Convert Sunday from 0 to 7
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

        // First get business_plan_id for this project
        const { data: businessPlan } = await supabase
          .from('business_plans')
          .select('id')
          .eq('project_id', project.id)
          .limit(1)
          .maybeSingle();

        if (businessPlan) {
          const { data: tasks } = await supabase
            .from('weekly_tasks')
            .select('*')
            .eq('business_plan_id', businessPlan.id)
            .eq('week_number', weekNumber)
            .eq('day_of_week', dayOfWeek)
            .order('created_at');

          if (tasks && tasks.length > 0) {
            setDailyTasks(tasks.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description || undefined,
              priority: (t.priority as "low" | "medium" | "high") || "medium",
              taskType: t.task_type,
              isCompleted: t.is_completed || false,
            })));
          }
        }

        // If no tasks from database, check bot_context for generated schedule info
        if (dailyTasks.length === 0) {
          const { data: context } = await supabase
            .from('bot_context')
            .select('context_key, context_value')
            .eq('project_id', project.id)
            .in('context_key', ['weekly_activities', 'marketing_channels', 'priorities']);

          // Generate sample daily tasks from context
          if (context && context.length > 0) {
            const activities = context.find(c => c.context_key === 'weekly_activities')?.context_value;
            const channels = context.find(c => c.context_key === 'marketing_channels')?.context_value;
            
            if (activities || channels) {
              // Create sample tasks based on context
              const sampleTasks: DailyTask[] = [];
              
              if (channels) {
                const channelList = channels.split(',').map((c: string) => c.trim()).slice(0, 2);
                channelList.forEach((channel: string, idx: number) => {
                  sampleTasks.push({
                    id: `sample-${idx}`,
                    title: `Създай съдържание за ${channel}`,
                    description: `Планирай и публикувай в ${channel}`,
                    priority: idx === 0 ? "high" : "medium",
                    taskType: "content",
                    isCompleted: false,
                  });
                });
              }

              if (activities) {
                sampleTasks.push({
                  id: 'sample-activity',
                  title: activities.split(',')[0]?.trim() || 'Работа по маркетинг',
                  priority: "medium",
                  taskType: "marketing",
                  isCompleted: false,
                });
              }

              setDailyTasks(sampleTasks.slice(0, 4));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching daily data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyData();
  }, [user]);

  const toggleTaskComplete = async (taskId: string) => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task || taskId.startsWith('sample-')) return;

    const { error } = await supabase
      .from('weekly_tasks')
      .update({ is_completed: !task.isCompleted })
      .eq('id', taskId);

    if (!error) {
      setDailyTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      ));
    }
  };

  const todayFormatted = new Date().toLocaleDateString('bg-BG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const completedCount = dailyTasks.filter(t => t.isCompleted).length;
  const progress = dailyTasks.length > 0 ? (completedCount / dailyTasks.length) * 100 : 0;

  if (isLoading) {
    return (
      <Card className="p-6 rounded-2xl border-border/50">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Зареждане на дневния план...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-2xl border-border/50 bg-gradient-to-br from-card to-card/80">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">{greeting}!</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Вашият план за днес
          </h3>
          <p className="text-sm text-muted-foreground capitalize">{todayFormatted}</p>
        </div>
        
        {dailyTasks.length > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{completedCount}/{dailyTasks.length}</div>
            <div className="text-xs text-muted-foreground">завършени</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {dailyTasks.length > 0 && (
        <div className="h-2 bg-secondary/50 rounded-full mb-5 overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Next Step from Plan */}
      {nextStep && (
        <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-sm text-primary mb-2">
            <Target className="h-4 w-4" />
            <span className="font-medium">Следваща стъпка от плана</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                Стъпка {nextStep.stepNumber}: {nextStep.stepTitle}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Продължете с въпросите за да завършите
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="rounded-xl">
              <Link to="/plan" className="gap-1">
                Продължи
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Daily Tasks */}
      {dailyTasks.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span>Задачи за днес</span>
          </div>
          {dailyTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => toggleTaskComplete(task.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200",
                "border hover:shadow-sm",
                task.isCompleted 
                  ? "bg-success/5 border-success/20 opacity-60" 
                  : priorityColors[task.priority]
              )}
            >
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
                task.isCompleted 
                  ? "bg-success border-success" 
                  : "border-current"
              )}>
                {task.isCompleted && <CheckCircle2 className="h-3 w-3 text-success-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  task.isCompleted && "line-through"
                )}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {task.taskType && (
                  <Badge variant="secondary" className="text-xs">
                    {taskTypeLabels[task.taskType] || task.taskType}
                  </Badge>
                )}
                {task.timeSlot && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {task.timeSlot}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : !nextStep ? (
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Все още нямате задачи за днес
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link to="/plan" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Създай план
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Quick action */}
      {dailyTasks.length > 0 && completedCount === dailyTasks.length && (
        <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/20 text-center">
          <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
          <p className="text-sm font-medium text-success">Браво! Завършихте всички задачи за днес! 🎉</p>
        </div>
      )}
    </Card>
  );
}
