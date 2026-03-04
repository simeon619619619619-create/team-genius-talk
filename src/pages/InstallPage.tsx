import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle2, Share, PlusSquare, MoreVertical } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto py-12 px-4">
          <Card className="p-8 text-center rounded-3xl">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Приложението е инсталирано!</h1>
            <p className="text-muted-foreground">
              Симора вече е на вашия начален екран. Можете да го отворите директно от там.
            </p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-md mx-auto py-8 px-4 space-y-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Smartphone className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Инсталирай Симора</h1>
          <p className="text-muted-foreground">
            Добавете приложението към вашия начален екран за бърз достъп
          </p>
        </div>

        {/* Benefits */}
        <Card className="p-6 rounded-2xl space-y-4">
          <h2 className="font-semibold text-lg">Защо да инсталирате?</h2>
          <div className="space-y-3">
            {[
              "Бърз достъп от началния екран",
              "Работи офлайн",
              "Пълноекранен режим без браузър",
              "Известия за дневните задачи",
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Install Button or Instructions */}
        {deferredPrompt ? (
          <Button
            onClick={handleInstall}
            size="lg"
            className="w-full rounded-2xl h-14 text-base gap-3"
          >
            <Download className="h-5 w-5" />
            Инсталирай приложението
          </Button>
        ) : isIOS ? (
          <Card className="p-6 rounded-2xl">
            <h2 className="font-semibold text-lg mb-4">Как да инсталирате на iPhone/iPad</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Натиснете бутона "Сподели"</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Share className="h-4 w-4" /> в долната лента на Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Изберете "Добави на Начален екран"</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <PlusSquare className="h-4 w-4" /> от менюто
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Потвърдете с "Добави"</p>
                  <p className="text-sm text-muted-foreground">в горния десен ъгъл</p>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 rounded-2xl">
            <h2 className="font-semibold text-lg mb-4">Как да инсталирате на Android</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Отворете менюто на браузъра</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MoreVertical className="h-4 w-4" /> в горния десен ъгъл
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Изберете "Инсталиране на приложение"</p>
                  <p className="text-sm text-muted-foreground">или "Добави на начален екран"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Потвърдете инсталацията</p>
                  <p className="text-sm text-muted-foreground">и приложението ще се появи</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
