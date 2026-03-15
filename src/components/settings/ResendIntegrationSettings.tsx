import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2, Mail } from "lucide-react";

export function ResendIntegrationSettings() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("resend_integrations")
      .select("api_key")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setApiKey(data.api_key);
          setSaved(true);
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!apiKey.trim()) {
      toast.error("Моля, въведете API ключ");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("resend_integrations")
      .upsert({ user_id: user.id, api_key: apiKey.trim(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    if (error) {
      console.error("Resend save error:", error);
      toast.error("Грешка при запазване: " + error.message);
    } else {
      toast.success("Resend интеграцията е запазена");
      setSaved(true);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("resend_integrations").delete().eq("user_id", user.id);
    setApiKey("");
    setSaved(false);
    toast.success("Интеграцията е премахната");
    setSaving(false);
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Зареждане...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Resend — Email Marketing
              {saved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Свържете Resend за изпращане на имейл кампании и транзакционни имейли от AI асистента.
            </CardDescription>
          </div>
          <a
            href="https://resend.com/docs/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary"
          >
            Документация <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resend-api-key">API ключ</Label>
          <Input
            id="resend-api-key"
            type="password"
            placeholder="re_xxxxxxxx..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Намерете го в Resend → API Keys → Create API Key
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Запазване...</> : "Запази"}
          </Button>
          {saved && (
            <Button variant="outline" onClick={handleRemove} disabled={saving}>
              Премахни
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
