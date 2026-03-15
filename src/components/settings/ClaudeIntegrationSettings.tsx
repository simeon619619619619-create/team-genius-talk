import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/useOrganizations";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Bot } from "lucide-react";

export function ClaudeIntegrationSettings() {
  const { currentOrganization } = useOrganizations();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!currentOrganization) {
      setLoading(false);
      return;
    }
    loadIntegration();
  }, [currentOrganization]);

  const loadIntegration = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    const { data } = await supabase
      .from("organization_integrations")
      .select("api_key, is_active")
      .eq("organization_id", currentOrganization.id)
      .eq("integration_type", "claude")
      .maybeSingle();

    if (data) {
      setApiKey(data.api_key || "");
      setSaved(true);
    }
    setLoading(false);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error("Моля, въведете API ключ");
      return;
    }
    setTesting(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      if (response.ok) {
        toast.success("API ключът е валиден!");
      } else {
        const err = await response.json();
        toast.error(`Невалиден ключ: ${err.error?.message || "Грешка"}`);
      }
    } catch {
      toast.error("Грешка при тестване на ключа");
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!currentOrganization) return;
    if (!apiKey.trim()) {
      toast.error("Моля, въведете API ключ");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("organization_integrations")
      .upsert(
        {
          organization_id: currentOrganization.id,
          integration_type: "claude",
          api_key: apiKey.trim(),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,integration_type" }
      );

    if (error) {
      toast.error("Грешка при запазване");
    } else {
      toast.success("Claude интеграцията е свързана успешно");
      setSaved(true);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!currentOrganization) return;
    setSaving(true);
    await supabase
      .from("organization_integrations")
      .delete()
      .eq("organization_id", currentOrganization.id)
      .eq("integration_type", "claude");
    setApiKey("");
    setSaved(false);
    toast.success("Claude интеграцията е премахната");
    setSaving(false);
  };

  if (!currentOrganization) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">Изберете организация, за да настроите Claude интеграцията.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Зареждане...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Симора AI Асистент
              {saved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Свържете собствен Anthropic API ключ за AI асистента на организация "{currentOrganization.name}".
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="claude-api-key">Anthropic API ключ</Label>
          <Input
            id="claude-api-key"
            type="password"
            placeholder="sk-ant-api03-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Вземете ключ от console.anthropic.com → API Keys → Create Key
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Запазване...</> : saved ? "Обнови" : "Свържи"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !apiKey.trim()}>
            {testing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Тестване...</> : "Тествай ключа"}
          </Button>
          {saved && (
            <Button variant="outline" onClick={handleRemove} disabled={saving} className="text-destructive hover:text-destructive">
              Премахни
            </Button>
          )}
        </div>
        {!saved && (
          <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg">
            Без собствен ключ, AI асистентът ще използва глобалния ключ на платформата (ако е наличен).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
