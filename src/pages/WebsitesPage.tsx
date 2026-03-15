import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe, Plus, ExternalLink, Settings, Palette, FileCode, Search, Zap,
  Layout, Type, Image as ImageIcon, Smartphone, Monitor, Code2,
  Layers, Rocket, ChevronDown, Copy, Check, Eye, Trash2,
  PenTool, Shield, BarChart3, RefreshCw, Star
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface Website {
  id: string;
  name: string;
  url: string;
  status: "active" | "building" | "maintenance";
  template: string;
  createdAt: string;
  lastUpdate: string;
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

function loadWebsites(): Website[] {
  try {
    const saved = localStorage.getItem(WEBSITES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveWebsites(sites: Website[]) {
  localStorage.setItem(WEBSITES_KEY, JSON.stringify(sites));
}

/* ─── Collapsible Section ─── */
function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors">
        <div className="text-primary">{icon}</div>
        <span className="font-semibold text-sm flex-1">{title}</span>
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

/* ─── Main Page ─── */
export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>(loadWebsites);
  const [showNewSite, setShowNewSite] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTemplate, setNewTemplate] = useState("");

  const updateWebsites = useCallback((sites: Website[]) => {
    setWebsites(sites);
    saveWebsites(sites);
  }, []);

  const addWebsite = () => {
    if (!newName.trim()) { toast.error("Въведете име на сайта"); return; }
    const site: Website = {
      id: `site-${Date.now()}`,
      name: newName.trim(),
      url: newUrl.trim() || "#",
      status: "building",
      template: newTemplate || "custom",
      createdAt: new Date().toLocaleDateString("bg-BG"),
      lastUpdate: new Date().toLocaleDateString("bg-BG"),
    };
    updateWebsites([...websites, site]);
    setNewName(""); setNewUrl(""); setNewTemplate(""); setShowNewSite(false);
    toast.success(`${site.name} е добавен!`);
  };

  const removeWebsite = (id: string) => {
    updateWebsites(websites.filter(w => w.id !== id));
    toast.success("Сайтът е премахнат");
  };

  const toggleStatus = (id: string) => {
    updateWebsites(websites.map(w => {
      if (w.id !== id) return w;
      const next = w.status === "active" ? "maintenance" : w.status === "maintenance" ? "building" : "active";
      return { ...w, status: next, lastUpdate: new Date().toLocaleDateString("bg-BG") };
    }));
  };

  const statusColor = (s: Website["status"]) =>
    s === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" :
    s === "building" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-orange-500/20 text-orange-400 border-orange-500/30";

  const statusLabel = (s: Website["status"]) =>
    s === "active" ? "Активен" : s === "building" ? "В процес" : "Поддръжка";

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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Създаване на уебсайтове</h1>
            <p className="text-sm text-muted-foreground">Елена — Уеб Разработчик</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Онлайн</span>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — tools & sites */}
          <div className="lg:col-span-2 space-y-4">

            {/* My Websites */}
            <Section title="Моите сайтове" icon={<Globe className="w-4 h-4" />}>
              <div className="space-y-3">
                {websites.length === 0 && !showNewSite && (
                  <p className="text-sm text-muted-foreground py-2">Все още нямате добавени сайтове.</p>
                )}
                {websites.map(site => (
                  <div key={site.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 group">
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{site.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{site.url !== "#" ? site.url : "Няма URL"}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] cursor-pointer", statusColor(site.status))} onClick={() => toggleStatus(site.id)}>
                      {statusLabel(site.status)}
                    </Badge>
                    {site.url !== "#" && (
                      <a href={site.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                    <button onClick={() => removeWebsite(site.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                ))}
                {showNewSite ? (
                  <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
                    <Input placeholder="Име на сайта" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-sm" />
                    <Input placeholder="URL (по избор)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="h-8 text-sm" />
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

            {/* Quick Code Snippets */}
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
      <a href="#" class="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-full font-medium transition">
        Започнете
      </a>
      <a href="#" class="px-8 py-3 border border-gray-700 hover:border-gray-500 rounded-full transition">
        Научете повече
      </a>
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
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-180px)] flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Елена</CardTitle>
                    <p className="text-xs text-muted-foreground">Уеб Разработчик — готова да помогне</p>
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
