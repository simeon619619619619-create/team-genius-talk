import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";

export function GHLIntegrationSettings() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ghl_integrations")
      .select("api_key, location_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setApiKey(data.api_key);
          setLocationId(data.location_id);
          setSaved(true);
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!apiKey.trim() || !locationId.trim()) {
      toast.error("Моля, попълнете и двете полета");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("ghl_integrations")
      .upsert({ user_id: user.id, api_key: apiKey.trim(), location_id: locationId.trim(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    if (error) {
      toast.error("Грешка при запазване");
    } else {
      toast.success("GoHighLevel интеграцията е запазена");
      setSaved(true);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("ghl_integrations").delete().eq("user_id", user.id);
    setApiKey("");
    setLocationId("");
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
              GoHighLevel CRM
              {saved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Свържете вашия GoHighLevel акаунт за да добавяте контакти директно от AI асистента.
            </CardDescription>
          </div>
          <a
            href="https://marketplace.gohighlevel.com/docs/ghl/contacts/contacts"
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
          <Label htmlFor="ghl-api-key">Private API ключ</Label>
          <Input
            id="ghl-api-key"
            type="password"
            placeholder="eyJhbGciOiJIUz..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Намерете го в GHL → Settings → Private Integrations → Create new integration
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ghl-location-id">Location ID (Sub-account ID)</Label>
          <Input
            id="ghl-location-id"
            placeholder="AbC123xYz..."
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Намерете го в GHL → Settings → Business Info → Location ID
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
