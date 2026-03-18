import { useState } from "react";
import { Check, Crown, Zap, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription, STRIPE_PLANS, PlanType } from "@/hooks/useSubscription";
import { toast } from "sonner";

const plans = [
  {
    key: "monthly" as const,
    name: "Месечен",
    price: "€29",
    interval: "/месец",
    description: "Перфектен за стартиране",
    features: [
      "6 AI бота (Ивана, Лина, Мария...)",
      "Неограничени чат съобщения",
      "Имейл маркетинг (Resend)",
      "CRM интеграция",
      "Седмичен AI график",
    ],
    icon: Zap,
    popular: false,
  },
  {
    key: "biannual" as const,
    name: "6 месеца",
    price: "€149",
    interval: "/6 мес.",
    savings: "Спестяваш €25",
    description: "Най-популярен избор",
    features: [
      "Всичко от Месечен",
      "€24.80/мес вместо €29",
      "Приоритетна поддръжка",
      "Разширени отчети",
      "API достъп",
    ],
    icon: Star,
    popular: true,
  },
  {
    key: "lifetime" as const,
    name: "Завинаги",
    price: "€499",
    interval: "еднократно",
    description: "Плати веднъж, ползвай завинаги",
    features: [
      "Всичко от 6 месеца",
      "Бъдещи функции безплатно",
      "VIP поддръжка",
      "Без месечни плащания",
      "Early adopter предимства",
    ],
    icon: Crown,
    popular: false,
  },
];

interface PricingPlansProps {
  onUpgrade?: () => void;
}

export function PricingPlans({ onUpgrade }: PricingPlansProps) {
  const { subscribed, planType, createCheckout, openCustomerPortal, loading } = useSubscription();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planKey: keyof typeof STRIPE_PLANS) => {
    setProcessingPlan(planKey);
    try {
      await createCheckout(planKey);
      onUpgrade?.();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Грешка при създаване на плащане");
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Грешка при отваряне на портала");
    }
  };

  const isCurrentPlan = (planKey: string) => {
    return planType === planKey;
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const Icon = plan.icon;
        const isCurrent = isCurrentPlan(plan.key);
        const isProcessing = processingPlan === plan.key;

        return (
          <Card
            key={plan.key}
            className={`relative overflow-hidden transition-all duration-300 ${
              plan.popular
                ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                : "border-border hover:border-primary/50"
            } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -right-12 top-6 rotate-45 bg-primary px-12 py-1 text-xs font-semibold text-primary-foreground">
                Популярен
              </div>
            )}
            {isCurrent && (
              <Badge className="absolute left-4 top-4 bg-primary/10 text-primary border-primary/20">
                Текущ план
              </Badge>
            )}
            <CardHeader className={isCurrent ? "pt-12" : ""}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  plan.popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.interval}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              {"savings" in plan && plan.savings && (
                <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-600 border-green-500/20">
                  {plan.savings}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrent ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={loading}
                >
                  Управление на абонамента
                </Button>
              ) : (
                <Button
                  className={`w-full ${plan.popular ? "" : "variant-outline"}`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={isProcessing || loading || (subscribed && planType === "lifetime")}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Зареждане...
                    </>
                  ) : subscribed && planType === "lifetime" ? (
                    "Имате Завинаги"
                  ) : (
                    "Избери план"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
