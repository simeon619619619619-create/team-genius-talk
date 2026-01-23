import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Globe, Shield, Loader2, Instagram, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { ChangePasswordDialog } from "@/components/settings/ChangePasswordDialog";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  instagram: string;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    instagram: "",
    avatar_url: null,
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, instagram, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          instagram: data.instagram || "",
          avatar_url: data.avatar_url || null,
        });
      } else {
        setProfile({
          full_name: "",
          email: user.email || "",
          phone: "",
          instagram: "",
          avatar_url: null,
        });
      }
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message || "Неуспешно зареждане на профила",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          instagram: profile.instagram,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Профилът е запазен",
      });
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message || "Неуспешно запазване",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold tracking-tight text-foreground">
            Настройки
          </h1>
          <p className="text-lg text-muted-foreground">
            Управлявайте настройките на вашия акаунт
          </p>
        </div>

        {/* Profile Section */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-foreground">Профил</h2>
                <p className="text-sm text-muted-foreground">Вашата лична информация</p>
              </div>
            </div>
            <div className="space-y-6">
              {user && (
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile.avatar_url}
                  fullName={profile.full_name}
                  onAvatarChange={(url) => setProfile({ ...profile, avatar_url: url })}
                />
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                    Име и фамилия
                  </Label>
                  <Input 
                    id="fullName" 
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Въведете вашето име"
                    className="h-11 rounded-xl border-border/60 bg-background/50 focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Имейл</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="h-11 rounded-xl bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Имейлът не може да бъде променян</p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Телефон
                  </Label>
                  <Input 
                    id="phone" 
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+359..."
                    className="h-11 rounded-xl border-border/60 bg-background/50 focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    Instagram
                  </Label>
                  <Input 
                    id="instagram" 
                    value={profile.instagram}
                    onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                    placeholder="@username"
                    className="h-11 rounded-xl border-border/60 bg-background/50 focus:border-primary focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-foreground">Известия</h2>
                <p className="text-sm text-muted-foreground">Настройки за известия</p>
              </div>
            </div>
            <div className="space-y-1 divide-y divide-border/50">
              <div className="flex items-center justify-between py-4 first:pt-0">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Имейл известия</p>
                  <p className="text-sm text-muted-foreground">Получавайте актуализации по имейл</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-primary" />
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Известия за задачи</p>
                  <p className="text-sm text-muted-foreground">Известия за нови и променени задачи</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-primary" />
              </div>
              <div className="flex items-center justify-between py-4 last:pb-0">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">Седмични отчети</p>
                  <p className="text-sm text-muted-foreground">Получавайте седмични обобщения</p>
                </div>
                <Switch className="data-[state=checked]:bg-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-foreground">Език</h2>
                <p className="text-sm text-muted-foreground">Изберете език на интерфейса</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border-2 border-primary cursor-pointer transition-all duration-200 hover:bg-primary/15">
                <span className="text-3xl">🇧🇬</span>
                <div>
                  <span className="font-semibold text-foreground">Български</span>
                  <p className="text-xs text-muted-foreground">Избран</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border-2 border-transparent hover:border-border hover:bg-secondary cursor-pointer transition-all duration-200">
                <span className="text-3xl">🇬🇧</span>
                <div>
                  <span className="font-semibold text-foreground">English</span>
                  <p className="text-xs text-muted-foreground">Скоро</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-foreground">Сигурност</h2>
                <p className="text-sm text-muted-foreground">Настройки за сигурност</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Button 
                variant="outline" 
                className="h-14 justify-start gap-3 rounded-xl border-border/60 bg-background/50 hover:bg-secondary hover:border-border text-left"
                onClick={() => setPasswordDialogOpen(true)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Промяна на парола</span>
                  <span className="text-xs text-muted-foreground">Актуализирайте паролата си</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 justify-start gap-3 rounded-xl border-border/60 bg-background/50 text-left opacity-60 cursor-not-allowed"
                disabled
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">2FA</span>
                  <span className="text-xs text-muted-foreground">Скоро</span>
                </div>
              </Button>
            </div>
          </div>
        </div>

        <ChangePasswordDialog 
          open={passwordDialogOpen} 
          onOpenChange={setPasswordDialogOpen} 
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button 
            variant="outline" 
            onClick={loadProfile}
            className="h-11 px-6 rounded-xl border-border/60 hover:bg-secondary"
          >
            Отказ
          </Button>
          <Button 
            onClick={saveProfile}
            disabled={saving}
            className="h-11 px-8 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all duration-200"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Запази промените
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
