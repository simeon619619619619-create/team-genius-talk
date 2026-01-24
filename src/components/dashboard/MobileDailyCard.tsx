import { useState, useEffect } from "react";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

interface NextStep {
  stepTitle: string;
  stepNumber: number;
}

export function MobileDailyCard() {
  const { user } = useAuth();
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
    const fetchNextStep = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
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

        const { data: steps } = await supabase
          .from('plan_steps')
          .select('id, title, step_order, completed')
          .eq('project_id', project.id)
          .order('step_order');

        if (steps) {
          const incompleteStep = steps.find(s => !s.completed);
          if (incompleteStep) {
            setNextStep({
              stepTitle: incompleteStep.title,
              stepNumber: incompleteStep.step_order,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching next step:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNextStep();
  }, [user]);

  const todayFormatted = new Date().toLocaleDateString('bg-BG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  if (isLoading) {
    return null;
  }

  return (
    <Card className="p-4 rounded-2xl border-border/50 bg-card">
      {/* Header - Compact */}
      <div className="flex items-center gap-2 text-primary mb-2">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">{greeting}!</span>
      </div>
      
      <h3 className="text-base font-semibold text-foreground mb-1">
        Вашият план за днес
      </h3>
      <p className="text-xs text-muted-foreground capitalize mb-3">{todayFormatted}</p>

      {/* Next Step - Compact */}
      {nextStep && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-xs text-primary mb-1.5">
            <Target className="h-3.5 w-3.5" />
            <span className="font-medium">Следваща стъпка от плана</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-foreground truncate">
                Стъпка {nextStep.stepNumber}: {nextStep.stepTitle}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Продължете с въпросите
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="rounded-xl shrink-0 h-8 px-2">
              <Link to="/plan" className="gap-1 text-xs">
                Продължи
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
