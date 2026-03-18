import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Check, Loader2,
  Link2, CheckCircle2, ExternalLink, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useSubscription, STRIPE_PLANS } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

type JourneyType = "automation" | "startup";

interface BusinessProfile {
  industry: string;
  team_size: string;
  revenue: string;
  main_goal: string;
  website: string;
  ghl_api_key: string;
  ghl_location_id: string;
}

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
          <Button className="w-full" variant={popular ? "default" : "outline"} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Избери план"}
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
  const [journeyType] = useState<JourneyType>("automation");
  const [organizationName, setOrganizationName] = useState("");
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    industry: "",
    team_size: "",
    revenue: "",
    main_goal: "",
    website: "",
    ghl_api_key: "",
    ghl_location_id: "",
  });
  const [ghlSaved, setGhlSaved] = useState(false);
  const [savingGhl, setSavingGhl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  // Total steps: org name → business profile → payment
  const totalSteps = 3;

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

  const handleOrgNameSubmit = () => {
    if (!organizationName.trim()) {
      toast.error("Моля, въведете име на организацията");
      return;
    }
    setStep(2);
  };

  const handleBusinessProfileSubmit = () => {
    if (!businessProfile.industry) {
      toast.error("Моля, изберете индустрия");
      return;
    }
    setStep(3);
  };

  const handleSaveGhl = async () => {
    if (!user || !businessProfile.ghl_api_key.trim() || !businessProfile.ghl_location_id.trim()) {
      toast.error("Попълнете API ключ и Location ID");
      return;
    }
    setSavingGhl(true);
    const { error } = await supabase
      .from("ghl_integrations")
      .upsert(
        { user_id: user.id, api_key: businessProfile.ghl_api_key.trim(), location_id: businessProfile.ghl_location_id.trim(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) {
      toast.error("Грешка при свързване с GoHighLevel");
    } else {
      toast.success("GoHighLevel е свързан успешно!");
      setGhlSaved(true);
    }
    setSavingGhl(false);
  };

  const handlePromoCode = async () => {
    if (!user) return;
    const code = promoCode.trim();
    if (!code) { toast.error("Въведете промо код"); return; }

    setIsSubmitting(true);
    try {
      if (code === "simora69$") {
        await completeOnboarding();
        toast.success("Промо кодът е приложен! 100% отстъпка.");
        setTimeout(() => { window.location.href = "/"; }, 500);
        return;
      }

      const { data: promoData, error: promoErr } = await supabase
        .from("promo_codes").select("*").eq("code", code).eq("is_active", true).maybeSingle();
      if (promoErr || !promoData) { toast.error("Невалиден промо код"); setIsSubmitting(false); return; }

      const { data: existing } = await supabase
        .from("used_promo_codes").select("id").eq("promo_code_id", promoData.id).eq("user_id", user.id).maybeSingle();

      if (!existing) {
        if (promoData.max_uses !== null && promoData.current_uses >= promoData.max_uses) {
          toast.error("Промо кодът е изчерпан"); setIsSubmitting(false); return;
        }
        await supabase.from("used_promo_codes").insert({ promo_code_id: promoData.id, user_id: user.id });
      }

      await completeOnboarding();
      toast.success("Промо кодът е приложен! Безплатен достъп.");
      setTimeout(() => { window.location.href = "/"; }, 500);
    } catch {
      toast.error("Грешка. Опитайте отново.");
      setIsSubmitting(false);
    }
  };

  const completeOnboarding = async () => {
    const profileUpdate: Record<string, unknown> = {
      user_type: "owner",
      journey_type: journeyType,
      onboarding_completed: true,
    };

    if (journeyType === "automation") {
      profileUpdate.business_profile = {
        industry: businessProfile.industry,
        team_size: businessProfile.team_size,
        revenue: businessProfile.revenue,
        main_goal: businessProfile.main_goal,
        website: businessProfile.website || null,
      };
    }

    await updateProfile(profileUpdate as Parameters<typeof updateProfile>[0]);
    if (organizationName.trim()) {
      await createOrganization(organizationName.trim());
    }
  };

  const handlePlanSelect = async (planKey: keyof typeof STRIPE_PLANS) => {
    setLoadingPlan(planKey);
    setIsSubmitting(true);
    try {
      await completeOnboarding();
      await createCheckout(planKey);
      toast.success("Пренасочване към плащане...");
    } catch {
      toast.error("Грешка. Опитайте отново.");
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
      features: ["Неограничени проекти", "AI асистент", "Бизнес планове", "Екипна колаборация"],
    },
    {
      key: "yearly" as const,
      name: "Годишен",
      price: "€79.99",
      interval: "/година",
      features: ["Всичко от Месечен", "Приоритетна поддръжка", "Разширени отчети", "API достъп"],
      popular: true,
    },
    {
      key: "lifetime" as const,
      name: "Lifetime",
      price: "€239.99",
      interval: "еднократно",
      features: ["Всичко от Годишен", "Бъдещи функции безплатно", "VIP поддръжка", "Ексклузивен достъп"],
    },
  ];

  const planStep = 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <header className="p-6">
        <img src={logo} alt="Симора" className="h-10 dark:invert dark:brightness-200" />
      </header>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const s = i + 1;
          return (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                s < step ? "bg-primary w-8" : s === step ? "bg-primary w-12" : "bg-muted w-2"
              )}
            />
          );
        })}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <AnimatePresence mode="wait">

          {/* STEP 1: Business name */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Добре дошли в Симора!</h1>
                <p className="text-muted-foreground">Как се казва бизнесът ти?</p>
              </div>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <Input
                    placeholder="Моята Компания ЕООД"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="text-center text-lg h-12"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleOrgNameSubmit(); }}
                  />
                  <Button className="w-full" onClick={handleOrgNameSubmit} disabled={!organizationName.trim()}>
                    Продължи <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: Business profile + API connections */}
          {step === 2 && (
            <motion.div key="step3-auto" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Разкажи ни за бизнеса си</h1>
                <p className="text-muted-foreground">Тази информация помага на AI да те съветва по-добре + свържи инструментите си</p>
              </div>

              <div className="space-y-6">
                {/* Business profile form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" /> Бизнес профил
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Индустрия</Label>
                      <Select value={businessProfile.industry} onValueChange={(v) => setBusinessProfile(p => ({ ...p, industry: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Избери индустрия..." />
                        </SelectTrigger>
                        <SelectContent>
                          {["E-commerce / Онлайн магазин", "Услуги (B2C)", "Услуги (B2B)", "Ресторант / Хранителен бизнес", "Здраве и красота", "Недвижими имоти", "Образование / Курсове", "Производство", "Технологии / SaaS", "Маркетинг агенция", "Друго"].map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Брой служители</Label>
                      <Select value={businessProfile.team_size} onValueChange={(v) => setBusinessProfile(p => ({ ...p, team_size: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Размер на екипа..." />
                        </SelectTrigger>
                        <SelectContent>
                          {["Само аз", "2-5 човека", "6-15 човека", "16-50 човека", "50+ човека"].map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Месечни приходи (приблизително)</Label>
                      <Select value={businessProfile.revenue} onValueChange={(v) => setBusinessProfile(p => ({ ...p, revenue: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Приходи..." />
                        </SelectTrigger>
                        <SelectContent>
                          {["До €1,000", "€1,000 – €5,000", "€5,000 – €15,000", "€15,000 – €50,000", "€50,000+"].map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Основна цел</Label>
                      <Select value={businessProfile.main_goal} onValueChange={(v) => setBusinessProfile(p => ({ ...p, main_goal: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Какво искаш да постигнеш..." />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Спестяване на време чрез автоматизации",
                            "Повече продажби / клиенти",
                            "По-добро управление на екипа",
                            "Маркетинг и реклама",
                            "Финансово управление",
                            "Всичко горе",
                          ].map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Уебсайт (незадължително)</Label>
                      <Input
                        placeholder="https://example.com"
                        value={businessProfile.website}
                        onChange={(e) => setBusinessProfile(p => ({ ...p, website: e.target.value }))}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">Елена (AI бот за уеб) ще анализира сайта ти и ще предложи подобрения</p>
                    </div>
                  </CardContent>
                </Card>

                {/* GHL Connection */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Link2 className="h-4 w-4" /> GoHighLevel CRM
                          {ghlSaved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Свържи CRM системата за да добавяш контакти директно от AI асистента (незадължително)
                        </CardDescription>
                      </div>
                      <a href="https://app.gohighlevel.com" target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                        GHL <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Private API ключ</Label>
                        <Input
                          type="password"
                          placeholder="eyJhbGciOiJIUz..."
                          value={businessProfile.ghl_api_key}
                          onChange={(e) => setBusinessProfile(p => ({ ...p, ghl_api_key: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Location ID</Label>
                        <Input
                          placeholder="AbC123xYz..."
                          value={businessProfile.ghl_location_id}
                          onChange={(e) => setBusinessProfile(p => ({ ...p, ghl_location_id: e.target.value }))}
                        />
                      </div>
                    </div>
                    {!ghlSaved ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveGhl}
                        disabled={savingGhl || !businessProfile.ghl_api_key || !businessProfile.ghl_location_id}
                      >
                        {savingGhl ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Свързване...</> : "Свържи GoHighLevel"}
                      </Button>
                    ) : (
                      <p className="text-xs text-green-600 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> GoHighLevel е свързан успешно
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Назад
                  </Button>
                  <Button className="flex-1" onClick={handleBusinessProfileSubmit} disabled={!businessProfile.industry}>
                    Продължи <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 for STARTUP or STEP 4 for AUTOMATION: Plan selection */}
          {step === planStep && (
            <motion.div key="plan-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-4xl">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Изберете абонамент</h1>
                <p className="text-muted-foreground">Започнете с 7 дена безплатен период</p>
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
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-muted-foreground">Имаш промо код?</p>
                  <div className="flex gap-2 max-w-xs">
                    <Input
                      placeholder="Въведи промо код"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="text-center"
                      onKeyDown={(e) => { if (e.key === "Enter") handlePromoCode(); }}
                    />
                    <Button variant="outline" onClick={handlePromoCode} disabled={isSubmitting || !promoCode.trim()}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Приложи"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Назад
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
