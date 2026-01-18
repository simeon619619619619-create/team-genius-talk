import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Globe, Shield } from "lucide-react";

export default function SettingsPage() {
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Име</Label>
                <Input id="firstName" defaultValue="Иван" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input id="lastName" defaultValue="Петров" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Имейл</Label>
              <Input id="email" type="email" defaultValue="ivan@company.bg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Компания</Label>
              <Input id="company" defaultValue="Моята Компания ООД" />
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
          <Button variant="outline">Отказ</Button>
          <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl">Запази промените</Button>
        </div>
      </div>
    </MainLayout>
  );
}
