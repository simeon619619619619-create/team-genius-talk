import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, User, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function MemberLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [memberName, setMemberName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isNewMember, setIsNewMember] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");
      const emailParam = searchParams.get("email");

      if (!token || !emailParam) {
        toast.error("Невалиден линк за достъп");
        navigate("/auth");
        return;
      }

      setEmail(emailParam);

      try {
        // Verify the magic link token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "magiclink",
        });

        if (error) {
          console.error("Token verification error:", error);
          // If token is expired or invalid, user might need to login normally
          if (error.message.includes("expired")) {
            toast.error("Линкът е изтекъл. Моля, поискайте нов от вашия ръководител.");
          } else {
            toast.error("Невалиден или използван линк");
          }
          navigate("/auth");
          return;
        }

        if (data.user) {
          // Get profile to display name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", data.user.id)
            .single();

          if (profile?.full_name) {
            setMemberName(profile.full_name);
          }

          // Check if user already has a password set (not first login)
          // We check by trying to see if they have logged in before
          const lastSignIn = data.user.last_sign_in_at;
          const createdAt = data.user.created_at;
          
          // If last_sign_in_at equals created_at (approximately), it's their first login
          if (lastSignIn && createdAt) {
            const lastSignInDate = new Date(lastSignIn);
            const createdDate = new Date(createdAt);
            const diffMs = Math.abs(lastSignInDate.getTime() - createdDate.getTime());
            // If difference is more than 5 minutes, they've logged in before
            setIsNewMember(diffMs < 5 * 60 * 1000);
          }
        }

        setVerifying(false);
      } catch (err) {
        console.error("Verification error:", err);
        toast.error("Грешка при верификация");
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error("Паролата трябва да е поне 6 символа");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Паролите не съвпадат");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast.success("Паролата е зададена успешно!");
      navigate("/");
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast.error(error.message || "Грешка при задаване на парола");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Успешен вход!");
      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Грешка при вход");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Верифициране на достъпа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-primary/10 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">
              {isNewMember ? "Добре дошли!" : "Вход"}
            </CardTitle>
            <CardDescription className="text-base">
              {memberName && (
                <span className="block text-lg font-medium text-foreground mt-1">
                  {memberName}
                </span>
              )}
              {isNewMember 
                ? "Задайте парола за вашия акаунт" 
                : "Влезте с вашата парола"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isNewMember ? (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Нова парола</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Въведете парола"
                      className="pl-10 pr-10 h-11"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Потвърдете паролата</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Повторете паролата"
                      className="pl-10 h-11"
                      required
                    />
                    {password && confirmPassword && password === confirmPassword && (
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-success" />
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 gradient-primary text-primary-foreground shadow-lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Задай парола и влез
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Парола</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="loginPassword"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Въведете паролата си"
                      className="pl-10 pr-10 h-11"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 gradient-primary text-primary-foreground shadow-lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Влез
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
