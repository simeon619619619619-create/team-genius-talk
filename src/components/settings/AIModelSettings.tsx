import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Bot, Sparkles, Brain, MessageSquare, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderConfig {
  id: string;
  name: string;
  icon: typeof Bot;
  color: string;
  bgColor: string;
  borderColor: string;
  placeholder: string;
  helpText: string;
  models: string[];
  defaultModel: string;
}

const providers: ProviderConfig[] = [
  {
    id: "claude",
    name: "Claude (Anthropic)",
    icon: Brain,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    placeholder: "sk-ant-api03-...",
    helpText: "console.anthropic.com → API Keys → Create Key",
    models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"],
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    icon: Sparkles,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    placeholder: "AIzaSy...",
    helpText: "aistudio.google.com → Get API Key",
    models: ["gemini-2.0-flash", "gemini-2.5-pro-preview-06-05"],
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "openai",
    name: "ChatGPT (OpenAI)",
    icon: MessageSquare,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    placeholder: "sk-proj-...",
    helpText: "platform.openai.com → API Keys → Create new secret key",
    models: ["gpt-4o", "gpt-4o-mini"],
    defaultModel: "gpt-4o",
  },
];

interface ProviderState {
  apiKey: string;
  saved: boolean;
  model: string;
  showKey: boolean;
}

export function AIModelSettings() {
  const { currentOrganization } = useOrganizations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>(() => {
    const initial: Record<string, ProviderState> = {};
    for (const p of providers) {
      initial[p.id] = { apiKey: "", saved: false, model: p.defaultModel, showKey: false };
    }
    return initial;
  });

  useEffect(() => {
    if (!currentOrganization) {
      setLoading(false);
      return;
    }
    loadIntegrations();
  }, [currentOrganization]);

  const loadIntegrations = async () => {
    if (!currentOrganization) return;
    setLoading(true);

    const { data } = await supabase
      .from("organization_integrations")
      .select("integration_type, api_key, is_active, model")
      .eq("organization_id", currentOrganization.id)
      .in("integration_type", ["claude", "gemini", "openai"]);

    if (data) {
      const newStates = { ...providerStates };
      let foundActive: string | null = null;

      for (const row of data) {
        const pid = row.integration_type;
        if (newStates[pid]) {
          newStates[pid] = {
            apiKey: row.api_key || "",
            saved: true,
            model: row.model || providers.find(p => p.id === pid)!.defaultModel,
            showKey: false,
          };
          if (row.is_active) foundActive = pid;
        }
      }

      setProviderStates(newStates);
      setActiveProvider(foundActive);
    }
    setLoading(false);
  };

  const handleSave = async (providerId: string) => {
    if (!currentOrganization) return;
    const state = providerStates[providerId];
    if (!state.apiKey.trim()) {
      toast.error("Моля, въведете API ключ");
      return;
    }

    setSaving(providerId);

    const { error } = await supabase
      .from("organization_integrations")
      .upsert(
        {
          organization_id: currentOrganization.id,
          integration_type: providerId,
          api_key: state.apiKey.trim(),
          model: state.model,
          is_active: activeProvider === providerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,integration_type" }
      );

    if (error) {
      toast.error("Грешка при запазване");
    } else {
      toast.success(`${providers.find(p => p.id === providerId)!.name} е свързан`);
      setProviderStates(prev => ({
        ...prev,
        [providerId]: { ...prev[providerId], saved: true },
      }));
    }
    setSaving(null);
  };

  const handleActivate = async (providerId: string) => {
    if (!currentOrganization) return;
    const state = providerStates[providerId];
    if (!state.saved) {
      toast.error("Първо запазете API ключа");
      return;
    }

    setSaving(providerId);

    // Deactivate all others
    for (const p of providers) {
      if (p.id !== providerId && providerStates[p.id].saved) {
        await supabase
          .from("organization_integrations")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("organization_id", currentOrganization.id)
          .eq("integration_type", p.id);
      }
    }

    // Activate selected
    await supabase
      .from("organization_integrations")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("organization_id", currentOrganization.id)
      .eq("integration_type", providerId);

    setActiveProvider(providerId);
    toast.success(`${providers.find(p => p.id === providerId)!.name} е активиран като AI модел`);
    setSaving(null);
  };

  const handleRemove = async (providerId: string) => {
    if (!currentOrganization) return;
    setSaving(providerId);

    await supabase
      .from("organization_integrations")
      .delete()
      .eq("organization_id", currentOrganization.id)
      .eq("integration_type", providerId);

    setProviderStates(prev => ({
      ...prev,
      [providerId]: {
        apiKey: "",
        saved: false,
        model: providers.find(p => p.id === providerId)!.defaultModel,
        showKey: false,
      },
    }));

    if (activeProvider === providerId) setActiveProvider(null);
    toast.success("Интеграцията е премахната");
    setSaving(null);
  };

  if (!currentOrganization) {
    return (
      <div className="rounded-xl border border-border/50 bg-secondary/30 p-6 text-center">
        <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Изберете организация, за да настроите AI модел.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Зареждане на AI настройки...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">AI Модел за чат асистента</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Свържете API ключ и изберете кой модел да захранва Симора за "{currentOrganization.name}"
          </p>
        </div>
        {activeProvider && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Активен: {providers.find(p => p.id === activeProvider)?.name.split(" ")[0]}
          </div>
        )}
      </div>

      {/* Provider Cards */}
      <div className="grid gap-4">
        {providers.map((provider) => {
          const state = providerStates[provider.id];
          const isActive = activeProvider === provider.id;
          const isSaving = saving === provider.id;
          const Icon = provider.icon;

          return (
            <div
              key={provider.id}
              className={cn(
                "relative rounded-xl border-2 p-5 transition-all duration-200",
                isActive
                  ? `${provider.borderColor} ${provider.bgColor} shadow-sm`
                  : "border-border/50 bg-card hover:border-border"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Активен
                  </span>
                </div>
              )}

              {/* Provider Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", provider.bgColor)}>
                  <Icon className={cn("h-5 w-5", provider.color)} />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    {provider.name}
                    {state.saved && !isActive && <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
                  </h4>
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${provider.id}-key`} className="text-xs font-medium text-muted-foreground">
                    API ключ
                  </Label>
                  <div className="relative">
                    <Input
                      id={`${provider.id}-key`}
                      type={state.showKey ? "text" : "password"}
                      placeholder={provider.placeholder}
                      value={state.apiKey}
                      onChange={(e) =>
                        setProviderStates(prev => ({
                          ...prev,
                          [provider.id]: { ...prev[provider.id], apiKey: e.target.value },
                        }))
                      }
                      className="pr-10 h-10 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setProviderStates(prev => ({
                          ...prev,
                          [provider.id]: { ...prev[provider.id], showKey: !prev[provider.id].showKey },
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {state.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{provider.helpText}</p>
                </div>

                {/* Model Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Модел</Label>
                  <div className="flex gap-2 flex-wrap">
                    {provider.models.map((model) => (
                      <button
                        key={model}
                        onClick={() =>
                          setProviderStates(prev => ({
                            ...prev,
                            [provider.id]: { ...prev[provider.id], model },
                          }))
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          state.model === model
                            ? `${provider.bgColor} ${provider.color} ring-1 ${provider.borderColor}`
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {model.split("/").pop()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleSave(provider.id)}
                    disabled={isSaving || !state.apiKey.trim()}
                    className="h-8 text-xs"
                  >
                    {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                    {state.saved ? "Обнови" : "Запази"}
                  </Button>

                  {state.saved && !isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivate(provider.id)}
                      disabled={isSaving}
                      className={cn("h-8 text-xs", provider.color)}
                    >
                      Активирай
                    </Button>
                  )}

                  {state.saved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(provider.id)}
                      disabled={isSaving}
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Премахни
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      {!activeProvider && (
        <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg text-center">
          Без свързан модел, AI асистентът ще използва глобалния ключ на платформата (ако е наличен).
        </p>
      )}
    </div>
  );
}
