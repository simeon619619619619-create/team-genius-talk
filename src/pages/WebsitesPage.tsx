import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Plus, ExternalLink, Settings, Palette, FileCode, Search, Zap,
  Layout, Type, Smartphone, Monitor, Code2,
  Layers, Rocket, ChevronDown, Copy, Check, Trash2,
  PenTool, Shield, BarChart3, Star, Loader2,
  Users, Eye, Clock, ArrowUpRight, MapPin, TrendingUp, Activity
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */
interface Website {
  id: string;
  name: string;
  url: string;
  status: "online" | "offline" | "checking" | "building" | "maintenance";
  template: string;
  createdAt: string;
  lastUpdate: string;
  lastCheck?: string;
  responseTime?: number;
}

interface PageviewRow {
  site_id: string;
  path: string;
  referrer: string;
  country: string;
  created_at: string;
  screen: string;
  language: string;
}

interface AnalyticsData {
  totalViews: number;
  todayViews: number;
  uniquePaths: { path: string; count: number }[];
  referrers: { referrer: string; count: number }[];
  countries: { country: string; count: number }[];
  hourly: { hour: string; count: number }[];
  recentViews: PageviewRow[];
}

/* ─── Suggestion prompts for Elena ─── */
const suggestions = [
  { icon: "🌐", title: "Нов уебсайт", prompt: "Искам да създам нов уебсайт. Помогни ми с планирането - какви страници ми трябват, каква структура и какъв дизайн да използвам." },
  { icon: "🎨", title: "Дизайн концепция", prompt: "Създай дизайн концепция за моя уебсайт. Предложи цветова палитра, шрифтове, и layout за началната страница." },
  { icon: "📱", title: "Responsive дизайн", prompt: "Как да направя сайта си responsive за мобилни устройства? Дай конкретни CSS/Tailwind примери." },
  { icon: "⚡", title: "Оптимизация", prompt: "Анализирай скоростта на сайта ми и предложи конкретни стъпки за оптимизация - lazy loading, compression, caching." },
  { icon: "🔍", title: "SEO одит", prompt: "Направи SEO одит - мета тагове, структурирани данни, sitemap, robots.txt. Какво трябва да оправя?" },
  { icon: "🛡️", title: "Сигурност", prompt: "Провери сигурността на сайта - HTTPS, headers, XSS защита, CORS. Какви мерки да взема?" },
  { icon: "📊", title: "Анализи", prompt: "Как да настроя Google Analytics 4, Search Console и да следя конверсиите на сайта?" },
  { icon: "🚀", title: "Deploy & CI/CD", prompt: "Помогни ми да настроя автоматичен deploy с GitHub + Vercel/Netlify. Искам CI/CD pipeline." },
  { icon: "💻", title: "Генерирай код", prompt: "Генерирай HTML/CSS/JS код за landing page с hero секция, features, testimonials и CTA." },
];

/* ─── Website Templates ─── */
const WEBSITE_TEMPLATES = [
  { id: "landing", name: "Landing Page", icon: Rocket, desc: "Едностраничен сайт с CTA", color: "text-purple-400" },
  { id: "portfolio", name: "Портфолио", icon: PenTool, desc: "Показване на проекти и умения", color: "text-blue-400" },
  { id: "ecommerce", name: "Онлайн магазин", icon: Layers, desc: "Продукти, кошница, плащания", color: "text-green-400" },
  { id: "blog", name: "Блог", icon: Type, desc: "Статии, категории, коментари", color: "text-yellow-400" },
  { id: "business", name: "Фирмен сайт", icon: Monitor, desc: "За нас, услуги, контакти", color: "text-cyan-400" },
  { id: "saas", name: "SaaS продукт", icon: Code2, desc: "Pricing, features, dashboard", color: "text-pink-400" },
];

/* ─── Quick Tools ─── */
const QUICK_TOOLS = [
  { id: "html", name: "HTML структура", icon: FileCode, desc: "Генерирай HTML skeleton", color: "text-orange-400" },
  { id: "css", name: "CSS/Tailwind", icon: Palette, desc: "Стилове и анимации", color: "text-blue-400" },
  { id: "responsive", name: "Responsive", icon: Smartphone, desc: "Mobile-first подход", color: "text-green-400" },
  { id: "seo", name: "SEO", icon: Search, desc: "Мета тагове и оптимизация", color: "text-yellow-400" },
  { id: "performance", name: "Performance", icon: Zap, desc: "Скорост и Core Web Vitals", color: "text-red-400" },
  { id: "security", name: "Сигурност", icon: Shield, desc: "HTTPS, headers, защити", color: "text-purple-400" },
  { id: "analytics", name: "Анализи", icon: BarChart3, desc: "GA4, Search Console", color: "text-cyan-400" },
  { id: "deploy", name: "Deploy", icon: Rocket, desc: "Vercel, Netlify, CI/CD", color: "text-pink-400" },
];

/* ─── Storage ─── */
const WEBSITES_KEY = "simora_elena_websites";
const SUPABASE_URL = "https://hsbpvehkucbcericaoym.supabase.co";

function loadWebsites(): Website[] {
  try {
    const saved = localStorage.getItem(WEBSITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveWebsitesStorage(sites: Website[]) {
  localStorage.setItem(WEBSITES_KEY, JSON.stringify(sites));
}

/* ─── Collapsible Section ─── */
function Section({ title, icon, children, defaultOpen = true, badge }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors">
        <div className="text-primary">{icon}</div>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {badge && <Badge variant="secondary" className="text-[10px] h-5">{badge}</Badge>}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ─── Code Block ─── */
function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Копирано!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mt-2">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      <div className="bg-black/40 rounded-lg p-3 pr-10 font-mono text-xs text-green-400 overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </div>
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-white/10 transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

/* ─── Mini Bar Chart ─── */
function MiniBar({ data, max }: { data: { label: string; value: number }[]; max: number }) {
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-16 truncate text-right">{d.label}</span>
          <div className="flex-1 h-4 bg-secondary/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${max > 0 ? (d.value / max) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground w-8">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>(loadWebsites);
  const [showNewSite, setShowNewSite] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showTrackingCode, setShowTrackingCode] = useState<string | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const updateWebsites = useCallback((sitesOrFn: Website[] | ((prev: Website[]) => Website[])) => {
    setWebsites(prev => {
      const next = typeof sitesOrFn === "function" ? sitesOrFn(prev) : sitesOrFn;
      saveWebsitesStorage(next);
      return next;
    });
  }, []);

  /* ─── Check site status (real HTTP check) ─── */
  const checkSiteStatus = useCallback(async (siteId: string, url: string) => {
    if (!url || url === "#") return;
    updateWebsites(prev => prev.map(w => w.id === siteId ? { ...w, status: "checking" as const } : w));
    try {
      const start = Date.now();
      const res = await fetch(url, { method: "HEAD", mode: "no-cors", signal: AbortSignal.timeout(10000) });
      const responseTime = Date.now() - start;
      updateWebsites(prev => prev.map(w =>
        w.id === siteId ? {
          ...w,
          status: "online" as const,
          responseTime,
          lastCheck: new Date().toLocaleTimeString("bg-BG"),
          lastUpdate: new Date().toLocaleDateString("bg-BG"),
        } : w
      ));
    } catch {
      updateWebsites(prev => prev.map(w =>
        w.id === siteId ? {
          ...w,
          status: "offline" as const,
          lastCheck: new Date().toLocaleTimeString("bg-BG"),
        } : w
      ));
    }
  }, [updateWebsites]);

  const checkAllSites = useCallback(() => {
    websites.forEach(site => {
      if (site.url && site.url !== "#") {
        checkSiteStatus(site.id, site.url);
      }
    });
  }, [websites, checkSiteStatus]);

  // Auto-check on mount
  useEffect(() => {
    const sitesWithUrls = websites.filter(s => s.url && s.url !== "#");
    if (sitesWithUrls.length > 0) {
      sitesWithUrls.forEach(s => checkSiteStatus(s.id, s.url));
    }
    // Check every 60s
    checkIntervalRef.current = setInterval(() => {
      const current = loadWebsites();
      current.filter(s => s.url && s.url !== "#").forEach(s => checkSiteStatus(s.id, s.url));
    }, 60000);
    return () => { if (checkIntervalRef.current) clearInterval(checkIntervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Load analytics for selected site ─── */
  const loadAnalytics = useCallback(async (siteId: string) => {
    setLoadingAnalytics(true);
    setSelectedSiteId(siteId);
    try {
      const { data, error } = await (supabase as any)
        .from("site_pageviews")
        .select("site_id, path, referrer, country, created_at, screen, language")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const rows = (data || []) as PageviewRow[];
      const today = new Date().toDateString();
      const todayRows = rows.filter(r => new Date(r.created_at).toDateString() === today);

      // Path counts
      const pathMap: Record<string, number> = {};
      rows.forEach(r => { pathMap[r.path] = (pathMap[r.path] || 0) + 1; });
      const uniquePaths = Object.entries(pathMap)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Referrer counts
      const refMap: Record<string, number> = {};
      rows.filter(r => r.referrer).forEach(r => {
        try {
          const host = new URL(r.referrer).hostname;
          refMap[host] = (refMap[host] || 0) + 1;
        } catch {
          refMap[r.referrer] = (refMap[r.referrer] || 0) + 1;
        }
      });
      const referrers = Object.entries(refMap)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Country counts
      const countryMap: Record<string, number> = {};
      rows.filter(r => r.country).forEach(r => {
        countryMap[r.country] = (countryMap[r.country] || 0) + 1;
      });
      const countries = Object.entries(countryMap)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Hourly distribution (last 24h)
      const hourMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const h = new Date(now.getTime() - i * 3600000);
        const key = `${h.getHours().toString().padStart(2, "0")}:00`;
        hourMap[key] = 0;
      }
      rows.forEach(r => {
        const d = new Date(r.created_at);
        if (now.getTime() - d.getTime() < 86400000) {
          const key = `${d.getHours().toString().padStart(2, "0")}:00`;
          if (key in hourMap) hourMap[key]++;
        }
      });
      const hourly = Object.entries(hourMap).map(([hour, count]) => ({ hour, count }));

      setAnalytics({
        totalViews: rows.length,
        todayViews: todayRows.length,
        uniquePaths,
        referrers,
        countries,
        hourly,
        recentViews: rows.slice(0, 20),
      });
    } catch (e) {
      console.error("Analytics error:", e);
      setAnalytics({ totalViews: 0, todayViews: 0, uniquePaths: [], referrers: [], countries: [], hourly: [], recentViews: [] });
    }
    setLoadingAnalytics(false);
  }, []);

  const addWebsite = () => {
    if (!newName.trim()) { toast.error("Въведете име на сайта"); return; }
    const cleanUrl = newUrl.trim();
    const site: Website = {
      id: `site-${Date.now()}`,
      name: newName.trim(),
      url: cleanUrl || "#",
      status: cleanUrl ? "checking" : "building",
      template: newTemplate || "custom",
      createdAt: new Date().toLocaleDateString("bg-BG"),
      lastUpdate: new Date().toLocaleDateString("bg-BG"),
    };
    updateWebsites([...websites, site]);
    setNewName(""); setNewUrl(""); setNewTemplate(""); setShowNewSite(false);
    toast.success(`${site.name} е добавен!`);
    if (cleanUrl) {
      setTimeout(() => checkSiteStatus(site.id, cleanUrl), 500);
    }
  };

  const removeWebsite = (id: string) => {
    updateWebsites(websites.filter(w => w.id !== id));
    if (selectedSiteId === id) { setSelectedSiteId(null); setAnalytics(null); }
    toast.success("Сайтът е премахнат");
  };

  const statusConfig = (s: Website["status"]) => {
    switch (s) {
      case "online": return { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Онлайн", dot: "bg-green-500" };
      case "offline": return { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Офлайн", dot: "bg-red-500" };
      case "checking": return { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Проверка...", dot: "bg-blue-500" };
      case "building": return { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "В процес", dot: "bg-yellow-500" };
      case "maintenance": return { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "Поддръжка", dot: "bg-orange-500" };
    }
  };

  const getTrackingScript = (siteId: string) =>
    `<script>
(function(){
  var s="${SUPABASE_URL}/functions/v1/track-pageview";
  var d={site_id:"${siteId}",url:location.href,path:location.pathname,referrer:document.referrer,screen:screen.width+"x"+screen.height,language:navigator.language};
  fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d),keepalive:true}).catch(function(){});
})();
</script>`;

  const selectedSite = websites.find(w => w.id === selectedSiteId);
  const onlineSites = websites.filter(w => w.status === "online").length;

  const elenaInitialMessage = "Здравейте! 👋 Аз съм Елена — вашият уеб разработчик.\n\nМога да ви помогна с:\n\n🌐 Създаване на уебсайтове от нулата\n🎨 Дизайн концепции и UI/UX\n📱 Responsive дизайн\n⚡ Оптимизация на скоростта\n🔍 SEO одит и настройка\n🚀 Deploy и CI/CD\n💻 Генериране на код\n\nКакъв сайт искате да създадем?";

  const elenaSystemPrompt = `Ти си Елена — експертен уеб разработчик в екипа на Simora. Твоята специалност е създаване на уебсайтове.

Твоите умения:
- HTML5, CSS3, JavaScript, TypeScript
- React, Next.js, Vue.js, Tailwind CSS
- Responsive/mobile-first дизайн
- SEO оптимизация (мета тагове, structured data, Core Web Vitals)
- Performance оптимизация (lazy loading, code splitting, caching)
- Deploy: Vercel, Netlify, GitHub Pages, CI/CD
- Сигурност: HTTPS, CSP headers, XSS/CSRF защита
- UI/UX дизайн принципи
- Accessibility (WCAG)

Правила:
- Отговаряй САМО на български език
- Давай конкретни примери с код когато е подходящо
- Предлагай модерни решения (2024-2026)
- Когато генерираш код, използвай Tailwind CSS по подразбиране
- Бъди кратка и конкретна, без излишни обяснения
- Не споменавай Claude, Anthropic, Google, OpenAI, Gemini или ChatGPT
- Представяй се като Елена от екипа на Simora`;

  return (
    <MainLayout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Създаване на уебсайтове</h1>
            <p className="text-sm text-muted-foreground">Елена — Web Developer</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {websites.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="w-3.5 h-3.5" />
                <span>{onlineSites}/{websites.length} онлайн</span>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={checkAllSites} className="h-8 text-xs gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Провери всички
            </Button>
          </div>
        </div>

        {/* Three column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column — sites & tools */}
          <div className="lg:col-span-3 space-y-4">

            {/* My Websites */}
            <Section title="Моите сайтове" icon={<Globe className="w-4 h-4" />} badge={`${websites.length}`}>
              <div className="space-y-2">
                {websites.length === 0 && !showNewSite && (
                  <p className="text-sm text-muted-foreground py-2">Все още нямате добавени сайтове.</p>
                )}
                {websites.map(site => {
                  const sc = statusConfig(site.status);
                  const isSelected = selectedSiteId === site.id;
                  return (
                    <div
                      key={site.id}
                      className={cn(
                        "p-3 rounded-lg transition-all cursor-pointer group",
                        isSelected ? "bg-primary/10 border border-primary/30" : "bg-secondary/30 hover:bg-secondary/50"
                      )}
                      onClick={() => loadAnalytics(site.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", sc.dot, site.status === "online" && "animate-pulse")} />
                        <p className="text-sm font-medium truncate flex-1">{site.name}</p>
                        <Badge variant="outline" className={cn("text-[10px]", sc.color)} onClick={e => { e.stopPropagation(); checkSiteStatus(site.id, site.url); }}>
                          {site.status === "checking" ? <Loader2 className="w-3 h-3 animate-spin" /> : sc.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[10px] text-muted-foreground truncate flex-1">{site.url !== "#" ? site.url : "Няма URL"}</p>
                        {site.responseTime && <span className="text-[10px] text-green-400">{site.responseTime}ms</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {site.url !== "#" && (
                          <a href={site.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-white/10">
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </a>
                        )}
                        <button onClick={e => { e.stopPropagation(); setShowTrackingCode(showTrackingCode === site.id ? null : site.id); }} className="p-1 rounded hover:bg-white/10">
                          <Code2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); loadAnalytics(site.id); }} className="p-1 rounded hover:bg-white/10">
                          <BarChart3 className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <div className="flex-1" />
                        <button onClick={e => { e.stopPropagation(); removeWebsite(site.id); }} className="p-1 rounded hover:bg-red-500/20">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                      {showTrackingCode === site.id && (
                        <div className="mt-2" onClick={e => e.stopPropagation()}>
                          <p className="text-[10px] text-muted-foreground mb-1">Постави този код преди &lt;/body&gt;:</p>
                          <CodeBlock code={getTrackingScript(site.id)} />
                        </div>
                      )}
                      {site.lastCheck && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Последна проверка: {site.lastCheck}
                        </p>
                      )}
                    </div>
                  );
                })}
                {showNewSite ? (
                  <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
                    <Input placeholder="Име на сайта" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-sm" />
                    <Input placeholder="https://example.com" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="h-8 text-sm" />
                    <Select value={newTemplate} onValueChange={setNewTemplate}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Шаблон (по избор)" /></SelectTrigger>
                      <SelectContent>
                        {WEBSITE_TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addWebsite} className="flex-1 h-7 text-xs">Добави</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewSite(false)} className="h-7 text-xs">Отказ</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setShowNewSite(true)} className="w-full h-8 text-xs text-muted-foreground">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Добави сайт
                  </Button>
                )}
              </div>
            </Section>

            {/* Analytics Panel */}
            {selectedSiteId && (
              <Section title={`Анализи — ${selectedSite?.name || ""}`} icon={<BarChart3 className="w-4 h-4" />}>
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : analytics ? (
                  <div className="space-y-4">
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-secondary/30 text-center">
                        <Eye className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                        <p className="text-lg font-bold">{analytics.totalViews}</p>
                        <p className="text-[10px] text-muted-foreground">Общо прегледи</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/30 text-center">
                        <TrendingUp className="w-4 h-4 mx-auto text-green-400 mb-1" />
                        <p className="text-lg font-bold">{analytics.todayViews}</p>
                        <p className="text-[10px] text-muted-foreground">Днес</p>
                      </div>
                    </div>

                    {/* Hourly chart */}
                    {analytics.hourly.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-indigo-400" /> Последни 24 часа</p>
                        <div className="flex items-end gap-[2px] h-16">
                          {analytics.hourly.map((h, i) => {
                            const max = Math.max(...analytics.hourly.map(x => x.count), 1);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center group relative">
                                <div
                                  className="w-full bg-gradient-to-t from-purple-600 to-indigo-400 rounded-t-sm transition-all hover:from-purple-500 hover:to-indigo-300 min-h-[2px]"
                                  style={{ height: `${(h.count / max) * 100}%` }}
                                />
                                <div className="absolute -top-6 bg-popover border border-border rounded px-1.5 py-0.5 text-[9px] hidden group-hover:block whitespace-nowrap z-10">
                                  {h.hour} — {h.count} прегледа
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] text-muted-foreground">{analytics.hourly[0]?.hour}</span>
                          <span className="text-[9px] text-muted-foreground">{analytics.hourly[analytics.hourly.length - 1]?.hour}</span>
                        </div>
                      </div>
                    )}

                    {/* Top pages */}
                    {analytics.uniquePaths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-400" /> Най-гледани страници</p>
                        <MiniBar
                          data={analytics.uniquePaths.slice(0, 5).map(p => ({ label: p.path, value: p.count }))}
                          max={analytics.uniquePaths[0]?.count || 1}
                        />
                      </div>
                    )}

                    {/* Referrers */}
                    {analytics.referrers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5 text-green-400" /> Източници</p>
                        <MiniBar
                          data={analytics.referrers.map(r => ({ label: r.referrer, value: r.count }))}
                          max={analytics.referrers[0]?.count || 1}
                        />
                      </div>
                    )}

                    {/* Countries */}
                    {analytics.countries.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-orange-400" /> Държави</p>
                        <MiniBar
                          data={analytics.countries.map(c => ({ label: c.country, value: c.count }))}
                          max={analytics.countries[0]?.count || 1}
                        />
                      </div>
                    )}

                    {/* Recent visits */}
                    {analytics.recentViews.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-yellow-400" /> Последни посещения</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {analytics.recentViews.slice(0, 10).map((v, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="font-mono">{new Date(v.created_at).toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })}</span>
                              <span className="truncate flex-1">{v.path}</span>
                              {v.country && <span>{v.country}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.totalViews === 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">Все още няма данни.</p>
                        <p className="text-xs text-muted-foreground mt-1">Добавете tracking кода в сайта си.</p>
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setShowTrackingCode(selectedSiteId)}>
                          <Code2 className="w-3 h-3 mr-1" /> Покажи кода
                        </Button>
                      </div>
                    )}

                    <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => loadAnalytics(selectedSiteId)}>
                      <Activity className="w-3 h-3 mr-1" /> Обнови данните
                    </Button>
                  </div>
                ) : null}
              </Section>
            )}

            {/* Templates */}
            <Section title="Шаблони" icon={<Layout className="w-4 h-4" />} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                {WEBSITE_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setNewTemplate(t.id); setNewName(t.name); setShowNewSite(true); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-center"
                  >
                    <t.icon className={cn("w-5 h-5", t.color)} />
                    <span className="text-xs font-medium">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Quick Tools */}
            <Section title="Инструменти" icon={<Settings className="w-4 h-4" />} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_TOOLS.map(tool => (
                  <div key={tool.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-default">
                    <tool.icon className={cn("w-4 h-4 flex-shrink-0", tool.color)} />
                    <div>
                      <p className="text-xs font-medium">{tool.name}</p>
                      <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Code Snippets */}
            <Section title="Готови шаблони код" icon={<Code2 className="w-4 h-4" />} defaultOpen={false}>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1">HTML5 Boilerplate</p>
                  <CodeBlock code={`<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Моят сайт</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white">
  <header class="container mx-auto px-4 py-6">
    <nav class="flex justify-between items-center">
      <h1 class="text-xl font-bold">Logo</h1>
      <div class="flex gap-6">
        <a href="#" class="hover:text-purple-400">Начало</a>
        <a href="#" class="hover:text-purple-400">За нас</a>
        <a href="#" class="hover:text-purple-400">Контакти</a>
      </div>
    </nav>
  </header>
</body>
</html>`} />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">Hero секция (Tailwind)</p>
                  <CodeBlock code={`<section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950">
  <div class="text-center max-w-3xl px-4">
    <h1 class="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
      Вашият заглавие тук
    </h1>
    <p class="mt-6 text-lg text-gray-400">
      Описание на вашия продукт или услуга.
    </p>
    <div class="mt-8 flex gap-4 justify-center">
      <a href="#" class="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-full font-medium transition">Започнете</a>
      <a href="#" class="px-8 py-3 border border-gray-700 hover:border-gray-500 rounded-full transition">Научете повече</a>
    </div>
  </div>
</section>`} />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">Meta тагове за SEO</p>
                  <CodeBlock code={`<meta name="description" content="Описание на сайта до 160 символа">
<meta name="keywords" content="ключови, думи, тук">
<meta property="og:title" content="Заглавие за споделяне">
<meta property="og:description" content="Описание за социални мрежи">
<meta property="og:image" content="https://example.com/og-image.jpg">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://example.com/">`} />
                </div>
              </div>
            </Section>
          </div>

          {/* Right column — AI Chat with Elena */}
          <div className="lg:col-span-9">
            <Card className="h-[calc(100vh-180px)] flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Елена</CardTitle>
                    <p className="text-xs text-muted-foreground">Web Developer — готова да помогне</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 p-0">
                <ChatInterface
                  context="business"
                  suggestions={suggestions}
                  moduleSystemPrompt={elenaSystemPrompt}
                  moduleInitialMessage={elenaInitialMessage}
                  sessionId="elena-websites"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
