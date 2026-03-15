import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Mail } from "lucide-react";

const STORAGE_KEY = "simora_resend_settings";

export function ResendIntegrationSettings() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (data) {
        const parsed = JSON.parse(data);
        setApiKey(parsed.apiKey || "");
        setFromEmail(parsed.fromEmail || "");
        setSaved(!!parsed.apiKey);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    if (!apiKey.trim()) {
      toast.error("Моля, въведете API ключ");
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify({
        apiKey: apiKey.trim(),
        fromEmail: fromEmail.trim(),
      }));
      setSaved(true);
      toast.success("Resend настройките са запазени");
    } catch {
      toast.error("Грешка при запазване");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          Resend интеграция
          {saved && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        </CardTitle>
        <CardDescription>
          Свържете Resend за изпращане на имейли и нотификации
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="resend-api-key">API Key</Label>
          <Input
            id="resend-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="re_xxxxxxxxxxxxx"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="resend-from">От имейл (From)</Label>
          <Input
            id="resend-from"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="noreply@yourdomain.com"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Запази
        </Button>
      </CardContent>
    </Card>
  );
}
