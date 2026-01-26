import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useSubscription, STRIPE_PLANS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

type UserType = "worker" | "owner";

interface PlanCardProps {
  name: string;
  price: string;
  interval: string;
  features: string[];
  popular?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

function PlanCard({ name, price, interval, features, popular, onSelect, isLoading }: PlanCardProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Trial badge above each card */}
      <div className="mb-3 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full border border-primary/20">
        🎁 7 дена безплатен период
      </div>
      <Card className={cn(
        "relative transition-all duration-300 cursor-pointer hover:scale-[1.02] w-full",
        popular ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]" : "border-border hover:border-primary/50"
      )} onClick={onSelect}>
        {popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Популярен
          </div>
        )}
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-xl">{name}</CardTitle>
          <div className="mt-4">
            <span className="text-3xl font-bold">{price}</span>
            <span className="text-muted-foreground ml-1">{interval}</span>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <ul className="space-y-2 mb-6">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button 
            className="w-full" 
            variant={popular ? "default" : "outline"}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Избери план"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { createOrganization } = useOrganizations();
  const { createCheckout } = useSubscription();
  
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  const handlePromoCode = async () => {
    if (!user) {
      toast.error("Трябва да сте влезли в системата");
      return;
    }

    const enteredCode = promoCode.trim();
    if (!enteredCode) {
      toast.error("Моля, въведете промо код");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if promo code exists and is valid
      const { data: promoCodeData, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", enteredCode)
        .eq("is_active", true)
        .maybeSingle();

      if (promoError || !promoCodeData) {
        toast.error("Невалиден промо код");
        setIsSubmitting(false);
        return;
      }

      // Check if already used by this user
      const { data: existingUse } = await supabase
        .from("used_promo_codes")
        .select("id")
        .eq("promo_code_id", promoCodeData.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingUse) {
        toast.error("Вече сте използвали този промо код");
        setIsSubmitting(false);
        return;
      }

      // Check max uses
      if (promoCodeData.max_uses !== null && promoCodeData.current_uses >= promoCodeData.max_uses) {
        toast.error("Този промо код е изчерпан");
        setIsSubmitting(false);
        return;
      }

      // Record the promo code usage
      const { error: useError } = await supabase
        .from("used_promo_codes")
        .insert({
          promo_code_id: promoCodeData.id,
          user_id: user.id,
        });

      if (useError) {
        console.error("Error recording promo code usage:", useError);
        throw useError;
      }

      // Update profile with user type and mark as completed
      const success = await updateProfile({ 
        user_type: userType || "worker",
        onboarding_completed: true 
      });

      if (!success) {
        throw new Error("Failed to update profile");
      }

      // Create organization if owner
      if (userType === "owner" && organizationName.trim()) {
        await createOrganization(organizationName.trim());
      }

      toast.success("Промо кодът е приложен успешно! Имате вечен безплатен достъп.");
      
      // Small delay to ensure profile state is updated before navigation
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("Error applying promo code:", error);
      toast.error("Възникна грешка. Моля, опитайте отново.");
      setIsSubmitting(false);
    }
  };

  // Redirect if already completed onboarding
  useEffect(() => {
    if (!profileLoading && profile?.onboarding_completed) {
      navigate("/", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    if (type === "worker") {
      setStep(3); // Skip org name for workers
    } else {
      setStep(2);
    }
  };

  const handleOrgNameSubmit = () => {
    if (!organizationName.trim()) {
      toast.error("Моля, въведете име на организацията");
      return;
    }
    setStep(3);
  };

  const handlePlanSelect = async (planKey: keyof typeof STRIPE_PLANS) => {
    if (!userType) return;
    
    setLoadingPlan(planKey);
    setIsSubmitting(true);

    try {
      // Update profile with user type
      await updateProfile({ 
        user_type: userType,
        onboarding_completed: true 
      });

      // Create organization if owner
      if (userType === "owner" && organizationName.trim()) {
        await createOrganization(organizationName.trim());
      }

      // Create checkout with trial
      await createCheckout(planKey);
      
      toast.success("Настройката е завършена! Пренасочване към плащане...");
    } catch (error) {
      console.error("Error during onboarding:", error);
      toast.error("Възникна грешка. Моля, опитайте отново.");
    } finally {
      setIsSubmitting(false);
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      key: "monthly" as const,
      name: "Месечен",
      price: "€10.99",
      interval: "/месец",
      features: [
        "Неограничени проекти",
        "AI асистент",
        "Бизнес планове",
        "Екипна колаборация",
      ],
    },
    {
      key: "yearly" as const,
      name: "Годишен",
      price: "€79.99",
      interval: "/година",
      features: [
        "Всичко от Месечен",
        "Приоритетна поддръжка",
        "Разширени отчети",
        "API достъп",
      ],
      popular: true,
    },
    {
      key: "lifetime" as const,
      name: "Lifetime",
      price: "€239.99",
      interval: "еднократно",
      features: [
        "Всичко от Годишен",
        "Бъдещи функции безплатно",
        "VIP поддръжка",
        "Ексклузивен достъп",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <img src={logo} alt="Симора" className="h-10 dark:invert dark:brightness-200" />
      </header>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              s <= step ? "bg-primary w-8" : "bg-muted w-2",
              s === step && "w-12"
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <AnimatePresence mode="wait">
          {/* Step 1: User Type Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-2xl"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Добре дошли в Симора!</h1>
                <p className="text-muted-foreground text-lg">
                  Как ще използвате платформата?
                </p>
                <p className="text-sm text-destructive mt-2">
                  ⚠️ Този избор не може да бъде променен по-късно
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card 
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-primary",
                    userType === "worker" && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleUserTypeSelect("worker")}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mb-2">Работник</CardTitle>
                    <CardDescription>
                      Използвам Симора за себе си. Ще бъда поканен в организации от други.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card 
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-primary",
                    userType === "owner" && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleUserTypeSelect("owner")}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mb-2">Собственик на организация</CardTitle>
                    <CardDescription>
                      Ще създам организация и ще каня членове на екипа си.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Step 2: Organization Name (only for owners) */}
          {step === 2 && userType === "owner" && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-md"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Как се казва вашата организация?</h1>
                <p className="text-muted-foreground">
                  Това име ще виждат членовете на екипа ви
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Input
                      placeholder="Име на организацията"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="text-center text-lg h-12"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Назад
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleOrgNameSubmit}
                      disabled={!organizationName.trim()}
                    >
                      Продължи
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-4xl"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Моля изберете вашия абонамент</h1>
                <p className="text-muted-foreground">
                  Изберете план, който отговаря на вашите нужди
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    name={plan.name}
                    price={plan.price}
                    interval={plan.interval}
                    features={plan.features}
                    popular={plan.popular}
                    onSelect={() => handlePlanSelect(plan.key)}
                    isLoading={loadingPlan === plan.key}
                  />
                ))}
              </div>

              <div className="text-center space-y-4">
                <p className="text-xs text-muted-foreground">
                  Изисква се регистрация на карта. Отмени по всяко време преди края на периода.
                </p>
                
                {/* Promo code section */}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">Имаш промо код?</p>
                  <div className="flex gap-2 max-w-xs">
                    <Input
                      placeholder="Въведи промо код"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      onClick={handlePromoCode}
                      disabled={isSubmitting || !promoCode.trim()}
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Приложи"}
                    </Button>
                  </div>
                </div>
              </div>

              {step === 3 && (
                <div className="flex justify-center mt-6">
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep(userType === "owner" ? 2 : 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
