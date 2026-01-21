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

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  instagram: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    instagram: "",
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
        .select("full_name, email, phone, instagram")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          instagram: data.instagram || "",
        });
      } else {
        setProfile({
          full_name: "",
          email: user.email || "",
          phone: "",
          instagram: "",
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
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Настройки</h1>
          <p className="mt-2 text-muted-foreground">
            Управлявайте настройките на вашия акаунт
          </p>
        </div>

        {/* Profile Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Профил</h2>
              <p className="text-sm text-muted-foreground">Вашата лична информация</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Име и фамилия</Label>
              <Input 
                id="fullName" 
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Въведете вашето име"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Имейл</Label>
              <Input 
                id="email" 
                type="email" 
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Имейлът не може да бъде променян</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Телефон
              </Label>
              <Input 
                id="phone" 
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+359..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Label>
              <Input 
                id="instagram" 
                value={profile.instagram}
                onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                placeholder="@username"
              />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Известия</h2>
              <p className="text-sm text-muted-foreground">Настройки за известия</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Имейл известия</p>
                <p className="text-sm text-muted-foreground">Получавайте актуализации по имейл</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Известия за задачи</p>
                <p className="text-sm text-muted-foreground">Известия за нови и променени задачи</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Седмични отчети</p>
                <p className="text-sm text-muted-foreground">Получавайте седмични обобщения</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Език</h2>
              <p className="text-sm text-muted-foreground">Изберете език на интерфейса</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border-2 border-primary cursor-pointer">
              <span className="text-2xl">🇧🇬</span>
              <span className="font-medium">Български</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer transition-colors">
              <span className="text-2xl">🇬🇧</span>
              <span className="font-medium">English</span>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Сигурност</h2>
              <p className="text-sm text-muted-foreground">Настройки за сигурност</p>
            </div>
          </div>
          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              Промяна на парола
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Двуфакторна автентикация
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={loadProfile}>Отказ</Button>
          <Button 
            className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Запази промените
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
