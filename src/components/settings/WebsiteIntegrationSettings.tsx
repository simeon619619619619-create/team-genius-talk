import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Globe, Trash2, Plus, CheckCircle2 } from "lucide-react";

interface WebIntegration {
  id: string;
  platform: string;
  site_url: string;
  api_key: string;
  api_username: string | null;
  created_at: string;
}

const PLATFORM_INFO: Record<string, { label: string; keyHelp: string; needsUsername: boolean }> = {
  wordpress: {
    label: "WordPress",
    keyHelp: "WordPress → Потребители → Вашият профил → Application Passwords → Добави нова",
    needsUsername: true,
  },
  shopify: {
    label: "Shopify",
    keyHelp: "Shopify Admin → Settings → Apps → Develop apps → Admin API access token",
    needsUsername: false,
  },
  vercel: {
    label: "Vercel",
    keyHelp: "Vercel → Settings → Tokens → Create Token",
    needsUsername: false,
  },
  custom: {
    label: "Друг сайт",
    keyHelp: "Въведете API ключ или Bearer token за вашия сайт",
    needsUsername: false,
  },
};

export function WebsiteIntegrationSettings() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<WebIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [platform, setPlatform] = useState("wordpress");
  const [siteUrl, setSiteUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiUsername, setApiUsername] = useState("");

  const fetchIntegrations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("website_integrations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setIntegrations((data as WebIntegration[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleSave = async () => {
    if (!user || !siteUrl.trim() || !apiKey.trim()) {
      toast.error("Попълнете URL и API ключ");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("website_integrations").upsert({
      user_id: user.id,
      platform,
      site_url: siteUrl.trim().replace(/\/$/, ""),
      api_key: apiKey.trim(),
      api_username: PLATFORM_INFO[platform]?.needsUsername ? apiUsername.trim() || null : null,
    }, { onConflict: "user_id,platform,site_url" });

    if (error) {
      toast.error("Грешка: " + error.message);
    } else {
      toast.success(`${PLATFORM_INFO[platform]?.label} сайтът е свързан!`);
      setShowAdd(false);
      setSiteUrl("");
      setApiKey("");
      setApiUsername("");
      fetchIntegrations();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("website_integrations").delete().eq("id", id);
    setIntegrations(prev => prev.filter(i => i.id !== id));
    toast.success("Интеграцията е премахната");
  };

  const info = PLATFORM_INFO[platform];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Уебсайт интеграции
        </CardTitle>
        <CardDescription>
          Свържете сайта си и ботът Елена ще може директно да редактира съдържание — SEO текстове, блог постове, мета описания
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing integrations */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {integrations.map(int => (
              <div key={int.id} className="flex items-center justify-between p-3 rounded-xl border bg-secondary/30">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">
                      {PLATFORM_INFO[int.platform]?.label || int.platform}
                    </p>
                    <p className="text-xs text-muted-foreground">{int.site_url}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(int.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {integrations.length === 0 && !showAdd && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Няма свързани сайтове
              </p>
            )}
          </>
        )}

        {/* Add form */}
        {showAdd ? (
          <div className="space-y-3 p-4 rounded-xl border">
            <div>
              <Label>Платформа</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wordpress">WordPress</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="vercel">Vercel</SelectItem>
                  <SelectItem value="custom">Друг сайт</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>URL на сайта</Label>
              <Input
                placeholder="https://mysite.com"
                value={siteUrl}
                onChange={e => setSiteUrl(e.target.value)}
              />
            </div>

            {info?.needsUsername && (
              <div>
                <Label>Потребителско име (WordPress admin)</Label>
                <Input
                  placeholder="admin"
                  value={apiUsername}
                  onChange={e => setApiUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>API ключ / Application Password</Label>
              <Input
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">{info?.keyHelp}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Свържи
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Отказ</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowAdd(true)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Добави сайт
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
