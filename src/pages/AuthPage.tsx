import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, Briefcase, Users, Phone, Building2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logoIcon from "@/assets/logo-icon.png";

const BACKDOOR_PASSWORD = "777";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  // Waitlist state
  const [showLogin, setShowLogin] = useState(false);
  const [backdoorInput, setBackdoorInput] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: "", email: "", phone: "", business_name: "", interest: "" });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupUserType, setSignupUserType] = useState<"owner" | "worker" | null>(null);

  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [user, navigate, redirect]);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistForm.name || !waitlistForm.email) {
      toast.error("Моля, попълнете име и имейл");
      return;
    }
    setWaitlistLoading(true);
    const { error } = await supabase.from("waitlist").insert([waitlistForm]);
    setWaitlistLoading(false);
    if (error) {
      toast.error("Грешка. Опитайте отново.");
    } else {
      setWaitlistSubmitted(true);
    }
  };

  const handleBackdoorCheck = () => {
    if (backdoorInput === BACKDOOR_PASSWORD) {
      setShowLogin(true);
    } else {
      toast.error("Грешна парола");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Моля, попълнете всички полета");
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      toast.error("Грешка при вход: " + error.message);
    } else {
      toast.success("Успешен вход!");
      navigate(redirect);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      toast.error("Моля, попълнете имейл и парола");
      return;
    }
    if (!signupUserType) {
      toast.error("Моля, изберете тип акаунт");
      return;
    }
    if (!passwordStrength) {
      toast.error("Паролата трябва да е поне 8 символа, с главна буква и цифра");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Паролите не съвпадат");
      return;
    }

    setLoading(true);
    const { error, data } = await signUp(signupEmail, signupPassword, signupName);

    if (error) {
      setLoading(false);
      toast.error("Грешка при регистрация: " + error.message);
      return;
    }

    // Set user_type in profile after signup
    if (data?.user) {
      const profileUpdate: Record<string, unknown> = { user_type: signupUserType };
      if (signupUserType === "worker") {
        profileUpdate.onboarding_completed = true;
      }
      // Wait a moment for the trigger to create the profile
      await new Promise(r => setTimeout(r, 1000));
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("profiles").update(profileUpdate).eq("user_id", data.user.id);
    }

    setLoading(false);
    setConfirmationEmail(signupEmail);
    setShowConfirmation(true);
  };

  const hasMinLength = signupPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(signupPassword);
  const hasDigit = /[0-9]/.test(signupPassword);
  const passwordsMatch = signupPassword === signupConfirmPassword && signupConfirmPassword.length > 0;
  const passwordStrength = hasMinLength && hasUppercase && hasDigit;

  // ── WAITLIST SCREEN (default for all visitors) ──
  if (!showLogin) {
    // Waitlist success
    if (waitlistSubmitted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" />
          </div>
          <div className="w-full max-w-md relative z-10 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/30 mb-4 shadow-2xl">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Благодарим!</h1>
            <p className="text-muted-foreground text-lg">Записахме те в листата за ранен достъп. Ще се свържем с теб скоро!</p>
            <p className="text-sm text-muted-foreground">Имейл: <strong className="text-foreground">{waitlistForm.email}</strong></p>
          </div>
        </div>
      );
    }

    // Waitlist form
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        </div>

        <div className={cn(
          "w-full max-w-md relative z-10 transition-all duration-700",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-card border border-border/50 mb-6 shadow-2xl">
              <img src={logoIcon} alt="Симора" className="h-10 w-10 dark:invert dark:brightness-200" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Симора</h1>
            <p className="text-muted-foreground mt-3 text-lg">AI платформа за бизнес растеж</p>
          </div>

          <Card className="border border-border/50 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="text-center pb-4 pt-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-2 rounded-full mx-auto mb-3">
                <Sparkles className="h-4 w-4" />
                Ранен достъп
              </div>
              <CardTitle className="text-2xl font-display font-semibold">Запиши се в листата</CardTitle>
              <CardDescription className="text-base">Бъди сред първите, които ще получат достъп</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div className="group relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder="Вашето име *"
                    value={waitlistForm.name}
                    onChange={(e) => setWaitlistForm(f => ({ ...f, name: e.target.value }))}
                    className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base"
                    required
                  />
                </div>
                <div className="group relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    type="email"
                    placeholder="Имейл адрес *"
                    value={waitlistForm.email}
                    onChange={(e) => setWaitlistForm(f => ({ ...f, email: e.target.value }))}
                    className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base"
                    required
                  />
                </div>
                <div className="group relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    type="tel"
                    placeholder="Телефон *"
                    value={waitlistForm.phone}
                    onChange={(e) => setWaitlistForm(f => ({ ...f, phone: e.target.value }))}
                    className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base"
                    required
                  />
                </div>
                <div className="group relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    placeholder="Име на бизнеса (незадължително)"
                    value={waitlistForm.business_name}
                    onChange={(e) => setWaitlistForm(f => ({ ...f, business_name: e.target.value }))}
                    className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base"
                  />
                </div>
                <Select value={waitlistForm.interest} onValueChange={(v) => setWaitlistForm(f => ({ ...f, interest: v }))}>
                  <SelectTrigger className="h-14 rounded-2xl border-border/60 bg-muted/30 text-base">
                    <SelectValue placeholder="Какво те интересува?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Маркетинг план</SelectItem>
                    <SelectItem value="ai-bots">AI ботове</SelectItem>
                    <SelectItem value="team">Екипно управление</SelectItem>
                    <SelectItem value="automation">Автоматизация</SelectItem>
                    <SelectItem value="all">Всичко</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl text-base font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xl transition-all duration-300 group"
                  disabled={waitlistLoading}
                >
                  {waitlistLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Запиши ме
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>

              {/* Hidden backdoor */}
              <div className="mt-8 pt-6 border-t border-border/30">
                <button
                  onClick={() => {
                    const input = prompt("Парола:");
                    if (input === BACKDOOR_PASSWORD) setShowLogin(true);
                    else if (input) toast.error("Грешна парола");
                  }}
                  className="w-full text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
                >
                  Вече имаш акаунт?
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Email confirmation screen
  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" />
        </div>
        <div className="w-full max-w-md relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-card border border-border/50 mb-4 shadow-2xl">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Потвърдете имейла си</h1>
          <p className="text-muted-foreground text-lg">
            Изпратихме линк за потвърждение на <strong className="text-foreground">{confirmationEmail}</strong>
          </p>
          <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-3">
            <p className="text-sm text-muted-foreground">1. Отворете имейла си</p>
            <p className="text-sm text-muted-foreground">2. Кликнете бутона за потвърждение</p>
            <p className="text-sm text-muted-foreground">3. Ще бъдете пренасочени автоматично</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Не виждате имейла? Проверете папка Спам.
          </p>
          <Button variant="ghost" onClick={() => { setShowConfirmation(false); setActiveTab("login"); }}>
            Обратно към вход
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
      </div>

      <div className={cn(
        "w-full max-w-md relative z-10 transition-all duration-700",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-card border border-border/50 mb-6 shadow-2xl transition-all duration-500 hover:scale-105 hover:shadow-primary/20",
            mounted ? "opacity-100 scale-100" : "opacity-0 scale-75"
          )} style={{ transitionDelay: "100ms" }}>
            <img src={logoIcon} alt="Симора" className="h-10 w-10 dark:invert dark:brightness-200" />
          </div>
          <h1 className={cn(
            "text-4xl font-display font-bold text-foreground tracking-tight transition-all duration-500",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )} style={{ transitionDelay: "200ms" }}>
            Симора
          </h1>
          <p className={cn(
            "text-muted-foreground mt-3 text-lg transition-all duration-500",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )} style={{ transitionDelay: "300ms" }}>
            Управление на екипи и проекти
          </p>
        </div>

        <Card className={cn(
          "border border-border/50 shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )} style={{ transitionDelay: "400ms" }}>
          <CardHeader className="text-center pb-4 pt-8">
            <CardTitle className="text-2xl font-display font-semibold">Добре дошли</CardTitle>
            <CardDescription className="text-base">Влезте в акаунта си или се регистрирайте</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-14 p-1.5 bg-muted/50 rounded-2xl">
                <TabsTrigger 
                  value="login" 
                  className="rounded-xl h-full text-base font-medium transition-all duration-300 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-foreground"
                >
                  Вход
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-xl h-full text-base font-medium transition-all duration-300 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:text-foreground"
                >
                  Регистрация
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 space-y-5 animate-fade-in">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-4">
                    <div className="group relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        type="email"
                        placeholder="Имейл адрес"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    <div className="group relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Парола"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-12 pr-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-14 rounded-2xl text-base font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group" 
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Влез в профила
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-5 animate-fade-in">
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-4">
                    {/* User type selector */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSignupUserType("worker")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                          signupUserType === "worker"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border"
                        )}
                      >
                        <Users className="h-6 w-6" />
                        <span className="text-sm font-medium">Служител</span>
                        <span className="text-[11px] opacity-70">Член на екип</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupUserType("owner")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                          signupUserType === "owner"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border"
                        )}
                      >
                        <Briefcase className="h-6 w-6" />
                        <span className="text-sm font-medium">Фирма</span>
                        <span className="text-[11px] opacity-70">Имам бизнес</span>
                      </button>
                    </div>
                    <div className="group relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        type="text"
                        placeholder="Вашето име"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    <div className="group relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        type="email"
                        placeholder="Имейл адрес"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    <div className="group relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Парола (мин. 6 символа)"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-12 pr-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {/* Confirm password */}
                    <div className="group relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Потвърди парола"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className="pl-12 h-14 rounded-2xl border-border/60 bg-muted/30 text-base placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>
                    {/* Password requirements */}
                    {signupPassword && (
                      <div className="space-y-1.5">
                        <div className={cn("flex items-center gap-2 text-sm", hasMinLength ? "text-green-500" : "text-muted-foreground")}>
                          <CheckCircle2 className={cn("h-4 w-4", hasMinLength ? "opacity-100" : "opacity-40")} />
                          <span>Минимум 8 символа</span>
                        </div>
                        <div className={cn("flex items-center gap-2 text-sm", hasUppercase ? "text-green-500" : "text-muted-foreground")}>
                          <CheckCircle2 className={cn("h-4 w-4", hasUppercase ? "opacity-100" : "opacity-40")} />
                          <span>Главна буква</span>
                        </div>
                        <div className={cn("flex items-center gap-2 text-sm", hasDigit ? "text-green-500" : "text-muted-foreground")}>
                          <CheckCircle2 className={cn("h-4 w-4", hasDigit ? "opacity-100" : "opacity-40")} />
                          <span>Цифра</span>
                        </div>
                        {signupConfirmPassword && (
                          <div className={cn("flex items-center gap-2 text-sm", passwordsMatch ? "text-green-500" : "text-red-500")}>
                            <CheckCircle2 className={cn("h-4 w-4", passwordsMatch ? "opacity-100" : "opacity-40")} />
                            <span>{passwordsMatch ? "Паролите съвпадат" : "Паролите не съвпадат"}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-14 rounded-2xl text-base font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group" 
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Създай акаунт
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className={cn(
          "text-center text-sm text-muted-foreground mt-8 transition-all duration-500",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )} style={{ transitionDelay: "500ms" }}>
          С регистрацията приемате нашите условия за ползване
        </p>
      </div>
    </div>
  );
}
