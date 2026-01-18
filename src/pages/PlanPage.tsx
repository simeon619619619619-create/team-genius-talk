import { useState } from "react";
import { Check, Circle, ChevronRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const initialSteps: PlanStep[] = [
  {
    id: "1",
    title: "Резюме на бизнеса",
    description: "Кратко описание на бизнес идеята, мисията и визията",
    completed: true,
  },
  {
    id: "2",
    title: "Пазарен анализ",
    description: "Анализ на целевия пазар, клиенти и конкуренция",
    completed: true,
  },
  {
    id: "3",
    title: "Маркетинг стратегия",
    description: "Канали за достигане до клиентите и рекламни планове",
    completed: false,
  },
  {
    id: "4",
    title: "Оперативен план",
    description: "Ежедневни операции, доставчици и процеси",
    completed: false,
  },
  {
    id: "5",
    title: "Финансови прогнози",
    description: "Приходи, разходи, рентабилност и инвестиции",
    completed: false,
  },
];

export default function PlanPage() {
  const [steps, setSteps] = useState<PlanStep[]>(initialSteps);
  const [activeStep, setActiveStep] = useState<string>("3");

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  const toggleStep = (stepId: string) => {
    setSteps(steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    ));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Маркетинг план
          </h1>
          <p className="mt-2 text-muted-foreground">
            Създайте и проследявайте вашия бизнес план стъпка по стъпка
          </p>
        </div>

        {/* Progress */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground">
              Прогрес на плана
            </h2>
            <span className="text-sm text-muted-foreground">
              {completedCount} от {steps.length} завършени
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Steps List */}
          <div className="lg:col-span-1 space-y-3">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={cn(
                  "w-full flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-200",
                  activeStep === step.id
                    ? "glass-card shadow-lg"
                    : "hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
                  step.completed
                    ? "bg-success text-success-foreground"
                    : activeStep === step.id
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {step.completed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    step.completed && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  activeStep === step.id ? "text-primary" : "text-muted-foreground"
                )} />
              </button>
            ))}
          </div>

          {/* Active Step Details */}
          <div className="lg:col-span-2">
            {steps.filter(s => s.id === activeStep).map((step) => (
              <div key={step.id} className="glass-card rounded-xl p-8 animate-fade-in">
                <div className="flex items-start justify-between">
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

                <div className="mt-8 p-6 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">
                    Използвайте AI асистента за да генерирате съдържание за тази секция.
                    Можете да говорите или пишете на български език.
                  </p>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    variant={step.completed ? "outline" : "default"}
                    className={!step.completed ? "gradient-primary" : ""}
                    onClick={() => toggleStep(step.id)}
                  >
                    {step.completed ? "Отбележи като незавършено" : "Маркирай като завършено"}
                  </Button>
                  <Button variant="secondary">
                    Генерирай с AI
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
