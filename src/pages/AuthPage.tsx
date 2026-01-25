import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Sparkles, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, signIn, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const redirect = searchParams.get("redirect") || "/";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [user, navigate, redirect]);

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

    if (signupPassword.length < 6) {
      toast.error("Паролата трябва да е поне 6 символа");
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setLoading(false);

    if (error) {
      toast.error("Грешка при регистрация: " + error.message);
    } else {
      toast.success("Регистрацията е успешна! Вече сте влезли.");
      navigate(redirect);
    }
  };

  const passwordStrength = signupPassword.length >= 6;

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
            <Sparkles className="h-10 w-10 text-foreground" />
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
                    {signupPassword && (
                      <div className={cn(
                        "flex items-center gap-2 text-sm transition-all duration-300",
                        passwordStrength ? "text-success" : "text-muted-foreground"
                      )}>
                        <CheckCircle2 className={cn("h-4 w-4 transition-all", passwordStrength ? "opacity-100" : "opacity-40")} />
                        <span>Минимум 6 символа</span>
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
