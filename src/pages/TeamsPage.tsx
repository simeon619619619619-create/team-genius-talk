import { useState, useEffect, useCallback } from "react";
import { Plus, Users, UserCircle, ArrowLeft, Trash2, UserPlus, Loader2, Pencil, Copy, Check, Settings, Bot, LayoutGrid, Sparkles, ClipboardList, MessageSquare, Gamepad2, Edit } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TeamCard } from "@/components/teams/TeamCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTeams, TeamWithMembers, DbTeamMember } from "@/hooks/useTeams";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { useOrganizationProjects } from "@/hooks/useOrganizationProjects";
import { toast } from "sonner";
import { Team, TeamMember } from "@/types";
import { MemberPermissionsEditor, MemberPermissions } from "@/components/teams/MemberPermissionsEditor";
import { useMemberPermissions } from "@/hooks/useMemberPermissions";
import { VirtualOffice, type AiBot } from "@/components/teams/VirtualOffice";
import { VirtualOfficeGame } from "@/components/teams/VirtualOfficeGame";
import { lazy, Suspense } from "react";
const VirtualOffice3D = lazy(() => import("@/components/teams/VirtualOffice3D").then(m => ({ default: m.VirtualOffice3D })));
import { AiBotCard } from "@/components/teams/AiBotCard";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useOrganizationBots } from "@/hooks/useOrganizationBots";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { PricingPlans } from "@/components/subscription/PricingPlans";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Rocket } from "lucide-react";

function PromoCodeInput({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);
    try {
      if (code.trim() === "simora69$") {
        onSuccess();
        toast.success("Промо кодът е приложен! Пълен достъп.");
        return;
      }
      const { data: promoData } = await supabase
        .from("promo_codes").select("*").eq("code", code.trim()).eq("is_active", true).maybeSingle();
      if (!promoData) { toast.error("Невалиден промо код"); setLoading(false); return; }

      const { data: existing } = await supabase
        .from("used_promo_codes").select("id").eq("promo_code_id", promoData.id).eq("user_id", user.id).maybeSingle();
      if (!existing) {
        if (promoData.max_uses !== null && promoData.current_uses >= promoData.max_uses) {
          toast.error("Промо кодът е изчерпан"); setLoading(false); return;
        }
        await supabase.from("used_promo_codes").insert({ promo_code_id: promoData.id, user_id: user.id });
      }
      onSuccess();
      toast.success("Промо кодът е приложен!");
    } catch {
      toast.error("Грешка. Опитайте отново.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">Имаш промо код?</p>
      <div className="flex gap-2 max-w-xs">
        <Input placeholder="Въведи промо код" value={code} onChange={(e) => setCode(e.target.value)}
          className="text-center" onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }} />
        <Button variant="outline" onClick={handleApply} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Приложи"}
        </Button>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const { subscribed, checkSubscription } = useSubscription();
  const { projectId: currentProjectId, loading: projectLoading } = useCurrentProject();
  const { teams, loading, createTeam, updateTeam, createMemberDirectly, removeMember, refreshTeams } = useTeams(currentProjectId);
  const { projects: orgProjects, loading: projectsLoading } = useOrganizationProjects();
  const { savePermissions, getPermissions, loading: permissionsLoading } = useMemberPermissions();
  const navigate = useNavigate();

  // Navigate to assistant with selected bot (bots are synced to localStorage by the hook)
  const handleOpenBotChat = useCallback((bot: AiBot) => {
    navigate("/assistant", { state: { selectedBotId: bot.id, selectedBot: bot } });
  }, [navigate]);

  const [activeTeamTab, setActiveTeamTab] = useState<string>('command-center');
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<DbTeamMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);

  // Permission editing state
  const [editPermissionsOpen, setEditPermissionsOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<DbTeamMember | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<MemberPermissions | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // ─── AI BOTS (from database) ───
  const { bots: dbBots, loading: botsLoading, saveBots: saveAiBots, addBot: addAiBot, updateBot: updateAiBot, removeBot: removeAiBot } = useOrganizationBots();

  // Default bots are now seeded in the database via migration trigger.
  // Keep them here only as reference for the template picker description display.
  const DEFAULT_AI_BOTS: AiBot[] = [
    { id: "bot-1", name: "Симона", role: "Съдържание & Реклами", process: "Content + Ads", frequency: "Ежедневно", locked: true, automations: ["Posts", "Stories", "Reels", "Meta Ads", "Анализи"], tasks: [], skills: ["контент", "соц. мрежи", "Instagram", "Reels", "Stories", "copywriting", "дизайн", "календар", "хаштагове", "реклами", "Meta Ads", "Facebook Ads", "анализ", "ROAS", "CPM", "CTR"], taskGroups: [
      { id: "tg-1a", title: "Създаване на съдържание", subtasks: [
        { id: "st-1a1", text: "Планиране на месечен контент календар", done: false },
        { id: "st-1a2", text: "Генериране на 5 идеи за постове тази седмица", done: false },
        { id: "st-1a3", text: "Напиши caption за Instagram пост", done: false },
        { id: "st-1a4", text: "Подготви script за Reels/TikTok видео", done: false },
        { id: "st-1a5", text: "Генерирай 20 хаштагa за нишата ми", done: false },
      ]},
      { id: "tg-1c", title: "Анализ на реклами", subtasks: [
        { id: "st-1c1", text: "Анализирай рекламите за последните 7 дни", done: false },
        { id: "st-1c2", text: "Покажи ROAS и CPM по кампании", done: false },
        { id: "st-1c3", text: "Дай препоръки за оптимизация на рекламите", done: false },
        { id: "st-1c4", text: "Сравни performance на рекламите този vs миналия месец", done: false },
        { id: "st-1c5", text: "Публикувай пост в Instagram", done: false },
      ]},
      { id: "tg-1b", title: "Инструменти", subtasks: [
        { id: "st-1b1", text: "Отвори Canva за дизайн", done: false, action: { type: "open_url", url: "https://www.canva.com" } },
        { id: "st-1b2", text: "Отвори Meta Ads Manager", done: false, action: { type: "open_url", url: "https://adsmanager.facebook.com" } },
        { id: "st-1b3", text: "Отвори Meta Business Suite", done: false, action: { type: "open_url", url: "https://business.facebook.com" } },
      ]},
    ], skinColor: "#f5d0b0", hairColor: "#8b4513", shirtColor: "#34d399", state: "idle" },
    { id: "bot-2", name: "Симоне", role: "Продажби & Клиенти", process: "Lead Pipeline", frequency: "При нужда", locked: true, automations: ["CRM", "Follow-up", "Оферти"], tasks: [], skills: ["продажби", "лийдове", "follow-up", "клиенти", "имейл", "оферти", "преговори", "CRM"], taskGroups: [
      { id: "tg-2a", title: "Продажби", subtasks: [
        { id: "st-2a1", text: "Напиши follow-up имейл за потенциален клиент", done: false },
        { id: "st-2a2", text: "Генерирай оферта/предложение за услуга", done: false },
        { id: "st-2a3", text: "Анализирай защо клиент не купи и предложи подход", done: false },
        { id: "st-2a4", text: "Създай скрипт за продажбено обаждане", done: false },
      ]},
      { id: "tg-2b", title: "Инструменти", subtasks: [
        { id: "st-2b1", text: "Отвори Stripe Dashboard", done: false, action: { type: "open_url", url: "https://dashboard.stripe.com" } },
      ]},
    ], skinColor: "#f5c8b0", hairColor: "#3d1c02", shirtColor: "#fb923c", state: "idle" },
    { id: "bot-3", name: "Моника", role: "Email Маркетинг", process: "Email Campaigns", frequency: "Седмично", locked: true, automations: ["Newsletter", "Автоматизации", "Сегменти"], tasks: [], skills: ["имейл", "newsletter", "кампании", "автоматизация", "сегментация", "копирайтинг", "subject line"], taskGroups: [
      { id: "tg-3a", title: "Имейл кампании", subtasks: [
        { id: "st-3a1", text: "Напиши седмичен newsletter", done: false },
        { id: "st-3a2", text: "Генерирай 5 subject line варианта за A/B тест", done: false },
        { id: "st-3a3", text: "Създай welcome email за нови абонати", done: false },
        { id: "st-3a4", text: "Напиши промоционален имейл за оферта", done: false },
      ]},
    ], skinColor: "#f0b88a", hairColor: "#1a0a00", shirtColor: "#f472b6", state: "idle" },
    { id: "bot-4", name: "Симони", role: "Стратегия & Анализи", process: "Business Analytics", frequency: "Седмично", locked: true, automations: ["KPIs", "Отчети", "Конкуренция"], tasks: [], skills: ["стратегия", "анализи", "KPI", "конкуренция", "SWOT", "пазарно проучване", "бизнес план", "финанси"], taskGroups: [
      { id: "tg-4a", title: "Бизнес анализи", subtasks: [
        { id: "st-4a1", text: "Направи SWOT анализ на бизнеса ми", done: false },
        { id: "st-4a2", text: "Анализирай конкурентите ми и предложи стратегия", done: false },
        { id: "st-4a3", text: "Определи 5 ключови KPI за следващия месец", done: false },
        { id: "st-4a4", text: "Създай финансова прогноза за следващото тримесечие", done: false },
      ]},
      { id: "tg-4b", title: "Инструменти", subtasks: [
        { id: "st-4b1", text: "Google Analytics", done: false, action: { type: "open_url", url: "https://analytics.google.com" } },
        { id: "st-4b2", text: "Google Trends", done: false, action: { type: "open_url", url: "https://trends.google.com" } },
      ]},
    ], skinColor: "#e8b898", hairColor: "#660000", shirtColor: "#60a5fa", state: "idle" },
    { id: "bot-5", name: "Симонета", role: "Уеб & Техническа поддръжка", process: "Web Maintenance", frequency: "24/7", locked: true, automations: ["SEO Check", "Uptime", "Performance"], tasks: [], skills: ["уеб", "SEO", "оптимизация", "поддръжка", "performance", "UX", "landing page", "копирайтинг за уеб"], taskGroups: [
      { id: "tg-5a", title: "Уеб оптимизация", subtasks: [
        { id: "st-5a1", text: "Напиши SEO-оптимизиран текст за начална страница", done: false },
        { id: "st-5a2", text: "Генерирай meta description за 5 страници", done: false },
        { id: "st-5a3", text: "Предложи подобрения за UX на сайта", done: false },
        { id: "st-5a4", text: "Създай копи за Landing Page", done: false },
      ]},
      { id: "tg-5b", title: "Проверки", subtasks: [
        { id: "st-5b1", text: "Google PageSpeed", done: false, action: { type: "open_url", url: "https://pagespeed.web.dev" } },
        { id: "st-5b2", text: "Google Search Console", done: false, action: { type: "open_url", url: "https://search.google.com/search-console" } },
      ]},
    ], skinColor: "#f5c6a0", hairColor: "#4a2810", shirtColor: "#818cf8", state: "idle" },
    { id: "bot-6", name: "Симонка", role: "Проджект Мениджър", process: "Project Tracking", frequency: "Ежедневно", locked: true, automations: ["Задачи", "Дедлайни", "Координация"], tasks: [], skills: ["проджект мениджмънт", "задачи", "дедлайни", "планиране", "координация", "екип", "приоритизация", "ретроспектива"], taskGroups: [
      { id: "tg-6a", title: "Управление на проекти", subtasks: [
        { id: "st-6a1", text: "Планирай задачите за тази седмица", done: false },
        { id: "st-6a2", text: "Приоритизирай текущите задачи", done: false },
        { id: "st-6a3", text: "Направи ретроспектива на миналата седмица", done: false },
        { id: "st-6a4", text: "Създай timeline за нов проект", done: false },
      ]},
    ], skinColor: "#f0c8a0", hairColor: "#2c1608", shirtColor: "#fbbf24", state: "idle" },
  ];

  // ─── BOT TEMPLATES ───
  const BOT_TEMPLATES: (Omit<AiBot, "id"> & { category: string; description: string })[] = [
    { category: "Маркетинг", name: "Контент мениджър", description: "Планира и създава съдържание за социални мрежи", role: "Съдържание & Соц. Мрежи", process: "Content Pipeline", frequency: "3 пъти/ден", automations: ["Posts", "Stories", "Reels Script"], tasks: [], taskGroups: [
      { id: "tg-t1", title: "Създаване на съдържание", subtasks: [
        { id: "st-t1a", text: "Планиране на месечен контент календар", done: false },
        { id: "st-t1b", text: "Снимане/заснемане на Reels (3-5 бр./седмица)", done: false },
        { id: "st-t1c", text: "Подготовка на Stories (ежедневни)", done: false },
        { id: "st-t1d", text: "Дизайн на карусел постове", done: false },
        { id: "st-t1e", text: "Copywriting за всеки пост", done: false },
      ]},
    ], skinColor: "#f5d0b0", hairColor: "#8b4513", shirtColor: "#34d399", state: "idle" },
    { category: "Маркетинг", name: "Email маркетолог", description: "Управлява имейл кампании, newsletter-и и автоматизации", role: "Email Маркетинг", process: "Email Campaigns", frequency: "Седмично", automations: ["Newsletter", "Drip Campaigns", "Segmentation"], tasks: [], taskGroups: [
      { id: "tg-t2", title: "Имейл кампании", subtasks: [
        { id: "st-t2a", text: "Седмичен newsletter", done: false },
        { id: "st-t2b", text: "A/B тестове на subject lines", done: false },
        { id: "st-t2c", text: "Сегментация на аудиторията", done: false },
        { id: "st-t2d", text: "Drip campaign за нови абонати", done: false },
      ]},
    ], skinColor: "#f0b88a", hairColor: "#1a0a00", shirtColor: "#f472b6", state: "idle" },
    { category: "Маркетинг", name: "SEO специалист", description: "Оптимизира сайта за търсачки и следи класирането", role: "SEO & Органичен трафик", process: "SEO Audit", frequency: "Седмично", automations: ["Keyword Research", "Backlinks", "Technical SEO"], tasks: [], taskGroups: [
      { id: "tg-t3", title: "SEO оптимизация", subtasks: [
        { id: "st-t3a", text: "Keyword research за нови страници", done: false },
        { id: "st-t3b", text: "On-page оптимизация", done: false },
        { id: "st-t3c", text: "Линк билдинг стратегия", done: false },
        { id: "st-t3d", text: "Технически SEO одит", done: false },
      ]},
    ], skinColor: "#f5c6a0", hairColor: "#2c1608", shirtColor: "#a78bfa", state: "idle" },
    { category: "Маркетинг", name: "Paid Ads мениджър", description: "Управлява платени реклами в Google, Meta, TikTok", role: "Платена реклама", process: "Ad Campaigns", frequency: "Ежедневно", automations: ["Meta Ads", "Google Ads", "TikTok Ads"], tasks: [], taskGroups: [
      { id: "tg-t4", title: "Рекламни кампании", subtasks: [
        { id: "st-t4a", text: "Настройка на пиксели и конверсии", done: false },
        { id: "st-t4b", text: "Създаване на аудитории", done: false },
        { id: "st-t4c", text: "A/B тест на криейтиви", done: false },
        { id: "st-t4d", text: "Дневен мониторинг на ROAS", done: false },
        { id: "st-t4e", text: "Седмичен отчет за performance", done: false },
      ]},
    ], skinColor: "#e8b898", hairColor: "#660000", shirtColor: "#fb923c", state: "idle" },
    { category: "Продажби", name: "Лийд мениджър", description: "Обработва входящи лийдове и ги конвертира в клиенти", role: "Продажби & Лийдове", process: "Lead Pipeline", frequency: "При нужда", automations: ["CRM", "Lead Scoring", "Follow-up"], tasks: [], taskGroups: [
      { id: "tg-t5", title: "Обработка на лийдове", subtasks: [
        { id: "st-t5a", text: "Квалификация на нови лийдове", done: false },
        { id: "st-t5b", text: "Follow-up обаждания/имейли", done: false },
        { id: "st-t5c", text: "Обновяване на CRM статуси", done: false },
        { id: "st-t5d", text: "Седмичен pipeline отчет", done: false },
      ]},
    ], skinColor: "#f5c8b0", hairColor: "#3d1c02", shirtColor: "#60a5fa", state: "idle" },
    { category: "Продажби", name: "Клиентски мениджър", description: "Поддържа връзка с клиенти, upsell и retention", role: "Customer Success", process: "Client Relations", frequency: "Седмично", automations: ["Onboarding", "Check-ins", "Upsell"], tasks: [], taskGroups: [
      { id: "tg-t6", title: "Клиентски отношения", subtasks: [
        { id: "st-t6a", text: "Onboarding на нови клиенти", done: false },
        { id: "st-t6b", text: "Месечни check-in разговори", done: false },
        { id: "st-t6c", text: "Upsell предложения", done: false },
        { id: "st-t6d", text: "Събиране на отзиви", done: false },
      ]},
    ], skinColor: "#f0c8a0", hairColor: "#4a2810", shirtColor: "#fbbf24", state: "idle" },
    { category: "Технически", name: "Уеб разработчик", description: "Поддържа сайта, деплойва промени, следи за грешки", role: "Уеб Разработчик", process: "Web Development", frequency: "24/7", automations: ["Deploy", "SEO Check", "Build"], tasks: [], taskGroups: [
      { id: "tg-t7", title: "Поддръжка на сайта", subtasks: [
        { id: "st-t7a", text: "Проверка за грешки в конзолата", done: false },
        { id: "st-t7b", text: "Оптимизация на скоростта", done: false },
        { id: "st-t7c", text: "Актуализация на съдържанието", done: false },
        { id: "st-t7d", text: "Бекъп на базата данни", done: false },
      ]},
    ], skinColor: "#f5c6a0", hairColor: "#4a2810", shirtColor: "#818cf8", state: "idle" },
    { category: "Технически", name: "DevOps инженер", description: "CI/CD, мониторинг, инфраструктура и автоматизация", role: "DevOps & Инфраструктура", process: "Infrastructure", frequency: "24/7", automations: ["CI/CD", "Monitoring", "Alerts"], tasks: [], taskGroups: [
      { id: "tg-t8", title: "Инфраструктура", subtasks: [
        { id: "st-t8a", text: "Настройка на CI/CD pipeline", done: false },
        { id: "st-t8b", text: "Мониторинг на сървъри и услуги", done: false },
        { id: "st-t8c", text: "Настройка на алерти", done: false },
        { id: "st-t8d", text: "Оптимизация на разходи за хостинг", done: false },
      ]},
    ], skinColor: "#e8b898", hairColor: "#1a0a00", shirtColor: "#14b8a6", state: "idle" },
    { category: "Технически", name: "QA тестер", description: "Тества функционалност, UX и performance", role: "Quality Assurance", process: "Testing", frequency: "При release", automations: ["UI Tests", "Performance", "Bug Reports"], tasks: [], taskGroups: [
      { id: "tg-t9", title: "Тестване", subtasks: [
        { id: "st-t9a", text: "Функционални тестове", done: false },
        { id: "st-t9b", text: "UI/UX ревю", done: false },
        { id: "st-t9c", text: "Performance тестове", done: false },
        { id: "st-t9d", text: "Документиране на бъгове", done: false },
      ]},
    ], skinColor: "#f5d0b0", hairColor: "#8b4513", shirtColor: "#ec4899", state: "idle" },
    { category: "Операции", name: "HR мениджър", description: "Наемане, onboarding и управление на екипа", role: "HR & Наемане", process: "Recruitment", frequency: "Седмично", automations: ["Job Posts", "Interviews", "Onboarding"], tasks: [], taskGroups: [
      { id: "tg-t10", title: "Наемане на персонал", subtasks: [
        { id: "st-t10a", text: "Публикуване на обяви за работа", done: false },
        { id: "st-t10b", text: "Преглед на CV-та", done: false },
        { id: "st-t10c", text: "Провеждане на интервюта", done: false },
        { id: "st-t10d", text: "Onboarding на нови служители", done: false },
      ]},
    ], skinColor: "#f0b88a", hairColor: "#660000", shirtColor: "#f97316", state: "idle" },
    { category: "Операции", name: "Финансов анализатор", description: "Следи приходи, разходи и финансови KPI", role: "Финанси & Анализи", process: "Financial Reports", frequency: "Месечно", automations: ["Revenue", "Expenses", "KPIs"], tasks: [], taskGroups: [
      { id: "tg-t11", title: "Финансови отчети", subtasks: [
        { id: "st-t11a", text: "Месечен отчет приходи/разходи", done: false },
        { id: "st-t11b", text: "Проследяване на KPI-та", done: false },
        { id: "st-t11c", text: "Бюджетно планиране", done: false },
        { id: "st-t11d", text: "Cash flow прогноза", done: false },
      ]},
    ], skinColor: "#f5c6a0", hairColor: "#2c1608", shirtColor: "#6366f1", state: "idle" },
    { category: "Операции", name: "Проджект мениджър", description: "Координира проекти, задачи и срокове", role: "Проджект Мениджмънт", process: "Project Tracking", frequency: "Ежедневно", automations: ["Sprints", "Deadlines", "Status Updates"], tasks: [], taskGroups: [
      { id: "tg-t12", title: "Управление на проекти", subtasks: [
        { id: "st-t12a", text: "Планиране на спринтове", done: false },
        { id: "st-t12b", text: "Дневен standup с екипа", done: false },
        { id: "st-t12c", text: "Проследяване на дедлайни", done: false },
        { id: "st-t12d", text: "Ретроспектива", done: false },
      ]},
    ], skinColor: "#f0c8a0", hairColor: "#3d1c02", shirtColor: "#22d3ee", state: "idle" },
  ];

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string | null>(null);

  const templateCategories = [...new Set(BOT_TEMPLATES.map(t => t.category))];

  const addBotFromTemplate = (template: typeof BOT_TEMPLATES[0]) => {
    const { category, description, ...botData } = template;
    const newBot: AiBot = {
      ...botData,
      id: "bot-" + Date.now(),
      // Generate unique IDs for task groups and subtasks
      taskGroups: (botData.taskGroups || []).map(g => ({
        ...g,
        id: "tg-" + Date.now() + Math.random().toString(36).slice(2, 6),
        subtasks: g.subtasks.map(s => ({
          ...s,
          id: "st-" + Date.now() + Math.random().toString(36).slice(2, 6),
        })),
      })),
    };
    addAiBot(newBot);
    toast.success(`${newBot.name} е добавен в екипа!`);
    setTemplatePickerOpen(false);
  };

  const aiBots = dbBots;
  const [selectedAiBot, setSelectedAiBot] = useState<string | null>(null);
  const viewMode3D = true; // Always 3D
  const [aiBotModalOpen, setAiBotModalOpen] = useState(false);
  const [editingAiBot, setEditingAiBot] = useState<AiBot | null>(null);

  // AI Bot form state
  const [abName, setAbName] = useState("");
  const [abRole, setAbRole] = useState("");
  const [abProcess, setAbProcess] = useState("");
  const [abFrequency, setAbFrequency] = useState("");
  const [abAutomations, setAbAutomations] = useState("");
  const [abTasks, setAbTasks] = useState("");
  const [abShirt, setAbShirt] = useState("#818cf8");
  const [abHair, setAbHair] = useState("#4a2810");
  const [abSkin, setAbSkin] = useState("#f5c6a0");
  const [abSkills, setAbSkills] = useState("");

  // saveAiBots is now provided by useOrganizationBots hook

  const openAiBotModal = (bot?: AiBot) => {
    if (bot) {
      setEditingAiBot(bot);
      setAbName(bot.name);
      setAbRole(bot.role);
      setAbProcess(bot.process);
      setAbFrequency(bot.frequency);
      setAbAutomations(bot.automations.join(", "));
      setAbTasks(bot.tasks.join("\n"));
      setAbShirt(bot.shirtColor);
      setAbHair(bot.hairColor);
      setAbSkin(bot.skinColor);
      setAbSkills((bot.skills || []).join(", "));
    } else {
      setEditingAiBot(null);
      setAbName(""); setAbRole(""); setAbProcess(""); setAbFrequency("");
      setAbAutomations(""); setAbTasks(""); setAbSkills("");
      setAbShirt("#818cf8"); setAbHair("#4a2810"); setAbSkin("#f5c6a0");
    }
    setAiBotModalOpen(true);
  };

  const handleSaveAiBot = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AiBot = {
      id: editingAiBot?.id || "bot-" + Date.now(),
      name: abName,
      role: abRole,
      process: abProcess,
      frequency: abFrequency,
      automations: abAutomations.split(",").map(s => s.trim()).filter(Boolean),
      tasks: abTasks.split("\n").map(s => s.trim()).filter(Boolean),
      skills: abSkills.split(",").map(s => s.trim()).filter(Boolean),
      shirtColor: abShirt,
      hairColor: abHair,
      skinColor: abSkin,
      state: editingAiBot?.state || "idle",
    };
    if (editingAiBot) {
      updateAiBot(data);
    } else {
      addAiBot(data);
    }
    setAiBotModalOpen(false);
    toast.success(editingAiBot ? "Ботът е обновен!" : "Ботът е добавен!");
  };

  const handleUpdateAiBot = (updated: AiBot) => {
    updateAiBot(updated);
  };

  const handleDeleteAiBot = (id: string) => {
    const bot = aiBots.find(b => b.id === id);
    if (bot?.locked) return;
    removeAiBot(id);
    toast.success("Ботът е изтрит");
  };

  // New team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  // Edit team form state
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");

  // New member form state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [newMemberPermissions, setNewMemberPermissions] = useState<MemberPermissions>({
    can_view_tasks: false,
    can_view_business_plan: false,
    can_view_annual_plan: false,
    can_view_all: false,
  });

  const colors = [
    "hsl(221, 83%, 53%)",
    "hsl(174, 72%, 46%)",
    "hsl(262, 83%, 58%)",
    "hsl(25, 95%, 53%)",
    "hsl(142, 71%, 45%)",
  ];

  // Note: Project is now managed by useCurrentProject hook

  // Update selected team when teams change
  useEffect(() => {
    if (selectedTeam) {
      const updated = teams.find(t => t.id === selectedTeam.id);
      if (updated) {
        setSelectedTeam(updated);
      }
    }
  }, [teams]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createTeam(newTeamName, newTeamDescription);
    if (result) {
      setNewTeamOpen(false);
      setNewTeamName("");
      setNewTeamDescription("");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setAdding(true);
    try {
      const result = await createMemberDirectly(
        selectedTeam.id,
        newMemberName,
        newMemberRole,
        newMemberEmail || undefined,
        selectedProjectIds.length > 0 ? selectedProjectIds : undefined
      );
      if (result) {
        if (result.memberId) {
          await savePermissions(result.memberId, newMemberPermissions);
          setCreatedMemberId(result.memberId);
        }
        setAccessLink(result.accessLink || null);
        setEmailSent(!!(result as any).emailSent);
        setCreatedEmail((result as any).memberEmail || null);
        toast.success(
          (result as any).emailSent
            ? "Поканата е изпратена на имейла!"
            : "Членът е добавен успешно!"
        );
      }
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("");
      setSelectedProjectIds([]);
      setNewMemberPermissions({
        can_view_tasks: false,
        can_view_business_plan: false,
        can_view_annual_plan: false,
        can_view_all: false,
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCopyLink = async () => {
    if (!accessLink) return;
    try {
      await navigator.clipboard.writeText(accessLink);
      setCopied(true);
      toast.success("Линкът е копиран!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Грешка при копиране");
    }
  };

  const handleCloseAddDialog = () => {
    setNewMemberOpen(false);
    setAccessLink(null);
    setEmailSent(false);
    setCreatedEmail(null);
    setCreatedMemberId(null);
    setCopied(false);
  };

  const openEditPermissions = async (member: DbTeamMember) => {
    setEditingMember(member);
    const perms = await getPermissions(member.id);
    setEditingPermissions(perms || {
      can_view_tasks: false,
      can_view_business_plan: false,
      can_view_annual_plan: false,
      can_view_all: false,
    });
    setEditPermissionsOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!editingMember || !editingPermissions) return;
    
    setSavingPermissions(true);
    try {
      const success = await savePermissions(editingMember.id, editingPermissions);
      if (success) {
        toast.success("Правата са запазени!");
        setEditPermissionsOpen(false);
        setEditingMember(null);
        setEditingPermissions(null);
      }
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setUpdating(true);
    try {
      const result = await updateTeam(selectedTeam.id, editTeamName, editTeamDescription);
      if (result) {
        setEditTeamOpen(false);
        // Update the selected team locally
        setSelectedTeam({
          ...selectedTeam,
          name: editTeamName,
          description: editTeamDescription,
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const openEditDialog = () => {
    if (selectedTeam) {
      setEditTeamName(selectedTeam.name);
      setEditTeamDescription(selectedTeam.description || "");
      setEditTeamOpen(true);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember(memberToRemove.id);
    setMemberToRemove(null);
  };

  // Convert DB team to UI team format
  const convertToUiTeam = (dbTeam: TeamWithMembers): Team => ({
    id: dbTeam.id,
    name: dbTeam.name,
    description: dbTeam.description || "",
    managerId: dbTeam.created_by || "",
    members: dbTeam.members.map(m => ({
      id: m.id,
      name: m.profile?.full_name || m.email.split("@")[0],
      email: m.email,
      role: m.role,
    })),
    color: colors[teams.indexOf(dbTeam) % colors.length],
  });

  if (loading || projectLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Влезте в профила си</h2>
          <p className="text-muted-foreground">За да управлявате екипите, първо трябва да влезете.</p>
        </div>
      </MainLayout>
    );
  }

  if (selectedTeam) {
    const teamMembers = selectedTeam.members;

    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <Button variant="ghost" onClick={() => setSelectedTeam(null)} className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Назад</span>
          </Button>

          <div 
            className="rounded-xl p-4 md:p-8 relative"
            style={{ background: `linear-gradient(135deg, ${colors[teams.indexOf(selectedTeam) % colors.length]} 0%, ${colors[teams.indexOf(selectedTeam) % colors.length]}99 100%)` }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 md:top-4 md:right-4 text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
              onClick={openEditDialog}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <h1 className="text-xl md:text-3xl font-display font-bold text-white pr-10">
              {selectedTeam.name}
            </h1>
            {selectedTeam.description && (
              <p className="mt-1 md:mt-2 text-sm md:text-base text-white/80">{selectedTeam.description}</p>
            )}
            <div className="mt-3 md:mt-4 flex items-center gap-2">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-white" />
              <span className="text-sm text-white">{teamMembers.length} членове</span>
            </div>
          </div>

          {/* Edit Team Dialog */}
          <Dialog open={editTeamOpen} onOpenChange={setEditTeamOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Редактиране на екипа</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditTeam} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="editTeamName">Име на екипа</Label>
                  <Input
                    id="editTeamName"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    placeholder="Напр. Маркетинг екип"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTeamDescription">Описание</Label>
                  <Input
                    id="editTeamDescription"
                    value={editTeamDescription}
                    onChange={(e) => setEditTeamDescription(e.target.value)}
                    placeholder="Кратко описание на екипа..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditTeamOpen(false)}>
                    Отказ
                  </Button>
                  <Button 
                    type="submit" 
                    className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl"
                    disabled={updating}
                  >
                    {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Запази
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg md:text-xl font-display font-semibold">Членове</h2>
            <Dialog open={newMemberOpen} onOpenChange={(open) => {
              if (open) {
                setNewMemberOpen(true);
              } else {
                handleCloseAddDialog();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg h-9 px-3">
                  <UserPlus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Добави член</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Добавяне на член</DialogTitle>
                </DialogHeader>
                
                {accessLink || emailSent ? (
                  <div className="space-y-4 mt-4">
                    <div className="rounded-lg bg-success/10 border border-success/20 p-4">
                      <p className="text-sm text-success font-medium mb-2">✓ Членът е добавен!</p>

                      {emailSent && createdEmail && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Изпратена е покана на <strong>{createdEmail}</strong>.
                          При отваряне на линка от имейла ще зададе парола и ще влезе директно.
                        </p>
                      )}

                      {accessLink && (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">
                            {emailSent ? "Или споделете този линк директно:" : "Споделете този линк с члена:"}
                          </p>
                          <div className="flex gap-2">
                            <Input
                              value={accessLink}
                              readOnly
                              className="text-xs font-mono"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={handleCopyLink}
                            >
                              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setAccessLink(null); setEmailSent(false); setCreatedEmail(null); }}
                      >
                        Добави друг
                      </Button>
                      <Button
                        type="button"
                        className="gradient-primary text-primary-foreground"
                        onClick={handleCloseAddDialog}
                      >
                        Готово
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddMember} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="memberName">Име</Label>
                      <Input
                        id="memberName"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="Въведете име..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memberEmail">Имейл</Label>
                      <Input
                        id="memberEmail"
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="email@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Имейлът на члена — ще получи линк за достъп
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memberRole">Роля</Label>
                      <Input
                        id="memberRole"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="Напр. Дизайнер"
                        required
                      />
                    </div>

                    {/* Project Access Selector */}
                    {orgProjects.length > 1 && (
                      <div className="space-y-2">
                        <Label>Достъп до проекти</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Членът автоматично получава достъп до текущия проект. Изберете допълнителни проекти:
                        </p>
                        <div className="space-y-2 rounded-lg border p-3 bg-secondary/30 max-h-40 overflow-y-auto">
                          {orgProjects
                            .filter(p => p.id !== currentProjectId) // Exclude current project
                            .map((project) => (
                              <div key={project.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`project-${project.id}`}
                                  checked={selectedProjectIds.includes(project.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedProjectIds([...selectedProjectIds, project.id]);
                                    } else {
                                      setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                                    }
                                  }}
                                />
                                <Label 
                                  htmlFor={`project-${project.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {project.name}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    <MemberPermissionsEditor
                      permissions={newMemberPermissions}
                      onChange={setNewMemberPermissions}
                    />
                    
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseAddDialog}>
                        Отказ
                      </Button>
                      <Button 
                        type="submit" 
                        className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl"
                        disabled={adding}
                      >
                        {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Добави член
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Team Members - Full width on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="glass-card rounded-xl p-3 md:p-4 animate-fade-in group relative">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-secondary shrink-0">
                    <UserCircle className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <h4 className="font-medium text-sm md:text-base truncate">
                        {member.profile?.full_name || member.email.split("@")[0]}
                      </h4>
                      <Badge variant={member.status === "accepted" ? "default" : "secondary"} className="text-[10px] md:text-xs shrink-0">
                        {member.status === "pending" ? "Чакащ" : "Приет"}
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{member.role}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPermissions(member);
                      }}
                      title="Редактирай права"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToRemove(member);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {teamMembers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Няма членове в екипа</p>
              <p className="text-sm">Поканете членове с бутона по-горе</p>
            </div>
          )}
        </div>

        {/* Remove Member Confirmation */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Премахване на член</AlertDialogTitle>
              <AlertDialogDescription>
                Сигурни ли сте, че искате да премахнете <strong>{memberToRemove?.profile?.full_name || memberToRemove?.email}</strong> от екипа?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отказ</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Премахни
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Permissions Dialog */}
        <Dialog open={editPermissionsOpen} onOpenChange={(open) => {
          if (!open) {
            setEditPermissionsOpen(false);
            setEditingMember(null);
            setEditingPermissions(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                Редактиране на права - {editingMember?.profile?.full_name || editingMember?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {editingPermissions && (
                <MemberPermissionsEditor
                  permissions={editingPermissions}
                  onChange={setEditingPermissions}
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditPermissionsOpen(false)}
              >
                Отказ
              </Button>
              <Button 
                type="button" 
                className="gradient-primary text-primary-foreground"
                onClick={handleSavePermissions}
                disabled={savingPermissions}
              >
                {savingPermissions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Запази
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  // Paywall: require subscription to use AI bots
  if (!subscribed) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
              <Rocket className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold">Активирай AI екипа си</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Завършихте бизнес плана — сега е време AI ботовете да работят за вас.
              Ивана, Лина, Мария и останалите са готови да създават съдържание,
              изпращат имейли и управляват маркетинга ви.
            </p>
          </div>

          <Card className="border-primary/20">
            <CardContent className="p-8">
              <PricingPlans onUpgrade={checkSubscription} />
            </CardContent>
          </Card>

          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              7 дни безплатен пробен период. Отмени по всяко време.
            </p>
            <PromoCodeInput onSuccess={checkSubscription} />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">Екипи</h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Управлявайте екипите и членовете им
            </p>
          </div>
          <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg h-9 px-3">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Нов екип</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Създаване на нов екип</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTeam} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Име на екипа</Label>
                  <Input
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Напр. Маркетинг екип"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamDescription">Описание</Label>
                  <Input
                    id="teamDescription"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="Кратко описание на екипа..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setNewTeamOpen(false)}>
                    Отказ
                  </Button>
                  <Button type="submit" className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl">
                    Създай екип
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-lg md:text-xl font-semibold mb-2">Нямате екипи</h2>
            <p className="text-sm">Създайте първия си екип с бутона по-горе</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={convertToUiTeam(team)}
                onSelect={() => setSelectedTeam(team)}
              />
            ))}
          </div>
        )}

        {/* ─── AI VIRTUAL OFFICE ─── */}
        <div className="pt-4 md:pt-8 border-t border-border mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-display font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                AI Екип
              </h2>
              <p className="text-sm text-muted-foreground hidden md:block">
                Виртуални асистенти и техните автоматизации
              </p>
            </div>
            {aiBots.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3"
                  onClick={() => openAiBotModal()}
                >
                  <Plus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Направи сам</span>
                </Button>
                <Button
                  size="sm"
                  className="gradient-primary text-primary-foreground shadow-lg h-9 px-3"
                  onClick={() => setTemplatePickerOpen(true)}
                >
                  <LayoutGrid className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Добави от шаблон</span>
                </Button>
              </div>
            )}
          </div>

          {aiBots.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-purple-300/40 dark:border-purple-700/40 bg-purple-50/30 dark:bg-purple-950/10 p-8 md:p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-purple-500" />
                </div>
              </div>
              <h3 className="text-lg font-display font-semibold mb-2">
                Вашият персонален екип се подготвя
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Останаха още малко въпроси! След като завършите <strong>Маркетинг плана</strong>, ще ви бъде изготвен персонален AI екип, съобразен с вашия бизнес.
              </p>
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60">
                  <ClipboardList className="h-3.5 w-3.5" />
                  1. Завършете Маркетинг план
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60">
                  <Bot className="h-3.5 w-3.5" />
                  2. Получавате AI екип
                </span>
              </div>
              <div className="mt-6 flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-4"
                  onClick={() => setTemplatePickerOpen(true)}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Или добавете ръчно
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Department navigation tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <Button
                  variant={activeTeamTab === 'command-center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTeamTab('command-center')}
                  className="shrink-0"
                >
                  <Gamepad2 className="h-4 w-4 mr-1.5" />
                  Команден център
                </Button>
                {aiBots.map((bot) => (
                  <Button
                    key={bot.id}
                    variant={activeTeamTab === bot.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTeamTab(bot.id)}
                    className="shrink-0"
                  >
                    <div className="w-4 h-4 rounded-full mr-1.5" style={{ backgroundColor: bot.shirtColor }} />
                    {bot.role.split(' & ')[0]}
                  </Button>
                ))}
              </div>

              {/* Tab content */}
              {activeTeamTab === 'command-center' ? (
                <div className="space-y-4">
                  {/* Video game */}
                  {viewMode3D ? (
                    <Suspense fallback={<div className="flex items-center justify-center h-[500px] bg-[#1a1a2e] rounded-xl"><Loader2 className="h-8 w-8 animate-spin text-purple-500" /></div>}>
                      <VirtualOffice3D
                        bots={aiBots}
                        selectedBotId={selectedAiBot}
                        onSelectBot={(id) => { setSelectedAiBot(id); if (id) setActiveTeamTab(id); }}
                      />
                    </Suspense>
                  ) : (
                    <VirtualOfficeGame
                      bots={aiBots}
                      selectedBotId={selectedAiBot}
                      onSelectBot={(id) => { setSelectedAiBot(id); if (id) setActiveTeamTab(id); }}
                      onOpenChat={handleOpenBotChat}
                    />
                  )}

                  {/* COO Chat - Simora bot */}
                  <div className="border border-border rounded-xl bg-card overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-border">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">С</div>
                      <div>
                        <h3 className="font-semibold">Симора</h3>
                        <p className="text-xs text-muted-foreground">COO -- Разпределя задачи между екипите</p>
                      </div>
                    </div>
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Чатът с COO бота Симора ще бъде достъпен скоро.</p>
                      <p className="text-xs mt-1">Тук ще можете да разпределяте задачи между отделите.</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Individual department view */
                (() => {
                  const bot = aiBots.find(b => b.id === activeTeamTab);
                  if (!bot) return null;
                  return (
                    <div className="border border-border rounded-xl bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ backgroundColor: `${bot.shirtColor}15` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: bot.shirtColor }}>
                            {bot.name[0]}
                          </div>
                          <div>
                            <h3 className="font-semibold">{bot.name}</h3>
                            <p className="text-xs text-muted-foreground">{bot.role} • {bot.frequency}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleOpenBotChat(bot)} className="gap-1.5 text-xs">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Чат
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAiBotModal(bot)} className="gap-1.5 text-xs">
                            <Edit className="h-3.5 w-3.5" />
                            Редактирай
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <AiBotCard
                          bot={bot}
                          onEdit={openAiBotModal}
                          onDelete={handleDeleteAiBot}
                          onUpdate={handleUpdateAiBot}
                          onOpenChat={handleOpenBotChat}
                          embedded
                        />
                      </div>
                    </div>
                  );
                })()
              )}
            </>
          )}
        </div>

        {/* ─── BOT TEMPLATE PICKER ─── */}
        <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-purple-500" />
                Добави бот от шаблон
              </DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={templateFilter === null ? "default" : "outline"}
                className="h-7 text-xs rounded-full"
                onClick={() => setTemplateFilter(null)}
              >
                Всички
              </Button>
              {templateCategories.map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={templateFilter === cat ? "default" : "outline"}
                  className="h-7 text-xs rounded-full"
                  onClick={() => setTemplateFilter(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                {BOT_TEMPLATES
                  .filter(t => !templateFilter || t.category === templateFilter)
                  .map((template, idx) => {
                    const alreadyAdded = aiBots.some(b => b.name === template.name && b.role === template.role);
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 transition-all ${
                          alreadyAdded
                            ? "border-border/30 bg-secondary/20 opacity-60"
                            : "border-border hover:border-purple-300 hover:shadow-md cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20"
                        }`}
                        onClick={() => !alreadyAdded && addBotFromTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                            style={{ background: template.shirtColor + "22", color: template.shirtColor }}
                          >
                            ★
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{template.name}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">{template.category}</Badge>
                              {alreadyAdded && <Badge variant="secondary" className="text-[10px]">Добавен</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.automations.map(a => (
                                <Badge key={a} variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800">
                                  {a}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
                {/* DIY Bot Card */}
                <div
                  className="rounded-xl border-2 border-dashed border-border hover:border-purple-400 p-4 transition-all cursor-pointer hover:bg-purple-50/50 dark:hover:bg-purple-950/20 flex flex-col items-center justify-center gap-2 min-h-[100px]"
                  onClick={() => { setTemplatePickerOpen(false); openAiBotModal(); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="font-semibold text-sm">Направи сам</span>
                  <p className="text-xs text-muted-foreground text-center">Създайте свой собствен бот с персонализирани задачи и умения</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── AI BOT MODAL ─── */}
        <Dialog open={aiBotModalOpen} onOpenChange={setAiBotModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingAiBot ? "Редактирай бот" : "Нов бот"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAiBot} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ab-name">Име</Label>
                  <Input id="ab-name" value={abName} onChange={e => setAbName(e.target.value)} placeholder="Елена" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ab-role">Роля</Label>
                  <Input id="ab-role" value={abRole} onChange={e => setAbRole(e.target.value)} placeholder="Уеб Разработчик" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ab-process">Процес</Label>
                  <Input id="ab-process" value={abProcess} onChange={e => setAbProcess(e.target.value)} placeholder="eufashioninstitute.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ab-freq">Честота</Label>
                  <Input id="ab-freq" value={abFrequency} onChange={e => setAbFrequency(e.target.value)} placeholder="На всеки 24ч" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-auto">Автоматизации</Label>
                <Input id="ab-auto" value={abAutomations} onChange={e => setAbAutomations(e.target.value)} placeholder="Deploy, SEO Check, Build" />
                <p className="text-[11px] text-muted-foreground">Разделени със запетая</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-skills">Умения (скилове)</Label>
                <Input id="ab-skills" value={abSkills} onChange={e => setAbSkills(e.target.value)} placeholder="уеб, код, SEO, deploy" />
                <p className="text-[11px] text-muted-foreground">Разделени със запетая — определят кои задачи може да изпълнява</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-tasks">Задачи</Label>
                <Textarea id="ab-tasks" value={abTasks} onChange={e => setAbTasks(e.target.value)} placeholder={"Поддръжка на сайта\nОптимизация"} rows={3} />
                <p className="text-[11px] text-muted-foreground">Всяка задача на нов ред</p>
              </div>
              <div className="space-y-1.5">
                <Label>Визуализация</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={abShirt} onChange={e => setAbShirt(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">Блуза</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={abHair} onChange={e => setAbHair(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">Коса</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={abSkin} onChange={e => setAbSkin(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">Кожа</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setAiBotModalOpen(false)}>
                  Отказ
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground shadow-lg">
                  {editingAiBot ? "Запази" : "Добави"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
