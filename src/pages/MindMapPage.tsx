import { useState, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  Users,
  DollarSign,
  Megaphone,
  Target,
  Mail,
  Share2,
  ShoppingCart,
  CreditCard,
  Repeat,
  Gift,
  Star,
  TrendingUp,
  Globe,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  UserCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Play,
  Loader2,
  Eye,
  EyeOff,
  XCircle,
  ListTodo,
  Zap,
  Link2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useOrganizations } from "@/hooks/useOrganizations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---
interface StepAction {
  text: string;
  done: boolean;
  assignee?: string;
  result?: string;
  running?: boolean;
}

interface BotSkillInfo {
  name: string;
  skills: string[];
}

interface ProcessStep {
  title: string;
  assignee: string;
  actions: StepAction[];
}

interface ProcessData {
  id: string;
  category: string;
  title: string;
  icon: string;
  steps: ProcessStep[];
}

// --- Categories ---
const CATEGORIES = [
  { id: "acquisition", label: "Привличане на клиенти", icon: Users, color: "#3b82f6", description: "Как клиентите ви намират" },
  { id: "conversion", label: "Конвертиране", icon: Target, color: "#8b5cf6", description: "Как превръщате интереса в продажба" },
  { id: "revenue", label: "Приходи", icon: DollarSign, color: "#10b981", description: "Как взимате парите" },
  { id: "retention", label: "Задържане", icon: Repeat, color: "#f59e0b", description: "Как карате клиентите да се върнат" },
];

// --- Default processes with detailed steps ---
const DEFAULT_PROCESSES: ProcessData[] = [
  {
    id: "social-media",
    category: "acquisition",
    title: "Социални мрежи",
    icon: "Share2",
    steps: [
      {
        title: "Създаване на съдържание",
        assignee: "",
        actions: [
          { text: "Планиране на месечен контент календар", done: false },
          { text: "Снимане/заснемане на Reels (3-5 бр./седмица)", done: false },
          { text: "Подготовка на Stories (ежедневни)", done: false },
          { text: "Дизайн на карусел постове (2 бр./седмица)", done: false },
          { text: "Написване на copywriting за всеки пост", done: false },
        ],
      },
      {
        title: "Публикуване по график",
        assignee: "",
        actions: [
          { text: "Настройване на scheduling tool (Later/Hootsuite)", done: false },
          { text: "Публикуване в оптимални часове (11:00, 18:00, 21:00)", done: false },
          { text: "Cross-posting в Instagram, Facebook, TikTok", done: false },
          { text: "Добавяне на хаштагове и локация", done: false },
        ],
      },
      {
        title: "Ангажиране с аудиторията",
        assignee: "",
        actions: [
          { text: "Отговор на всички коментари (до 1 час)", done: false },
          { text: "Отговор на DM-и (до 2 часа)", done: false },
          { text: "Коментиране на постове на конкуренти/партньори", done: false },
          { text: "Провеждане на Q&A в Stories (1 път/седмица)", done: false },
          { text: "Провеждане на Live сесии (1-2 пъти/месец)", done: false },
        ],
      },
      {
        title: "Анализ и оптимизация",
        assignee: "",
        actions: [
          { text: "Седмичен преглед на Insights (reach, engagement)", done: false },
          { text: "Идентифициране на топ 3 performing постове", done: false },
          { text: "Корекция на стратегията базирано на данни", done: false },
          { text: "Месечен отчет с KPIs", done: false },
        ],
      },
    ],
  },
  {
    id: "paid-ads",
    category: "acquisition",
    title: "Платена реклама",
    icon: "Megaphone",
    steps: [
      {
        title: "Таргет аудитория",
        assignee: "",
        actions: [
          { text: "Дефиниране на buyer persona (възраст, интереси, локация)", done: false },
          { text: "Създаване на Lookalike аудитории от клиенти", done: false },
          { text: "Retargeting аудитория (посетители на сайта)", done: false },
          { text: "Custom audience от имейл списък", done: false },
        ],
      },
      {
        title: "Рекламни криейтиви",
        assignee: "",
        actions: [
          { text: "Заснемане на видео реклами (15s и 30s варианти)", done: false },
          { text: "Дизайн на статични реклами (3-5 варианта)", done: false },
          { text: "Написване на ad copy (hook + benefit + CTA)", done: false },
          { text: "Подготовка на UGC съдържание", done: false },
        ],
      },
      {
        title: "Настройка на кампании",
        assignee: "",
        actions: [
          { text: "Структура: кампания → ad set → реклами", done: false },
          { text: "Задаване на дневен бюджет и bid стратегия", done: false },
          { text: "Инсталиране на Pixel/CAPI на сайта", done: false },
          { text: "Настройване на conversion tracking", done: false },
          { text: "Тестване на 3-5 различни ad sets", done: false },
        ],
      },
      {
        title: "A/B тестване",
        assignee: "",
        actions: [
          { text: "Тест на различни заглавия", done: false },
          { text: "Тест на различни визуали", done: false },
          { text: "Тест на различни аудитории", done: false },
          { text: "Анализ след 48-72 часа, спиране на губещи", done: false },
        ],
      },
      {
        title: "Мащабиране",
        assignee: "",
        actions: [
          { text: "Увеличаване на бюджет с 20% на всеки 2-3 дни", done: false },
          { text: "Дупликиране на печеливши ad sets", done: false },
          { text: "Разширяване към нови платформи (Google, TikTok)", done: false },
          { text: "Седмичен ROAS отчет", done: false },
        ],
      },
    ],
  },
  {
    id: "email-marketing",
    category: "acquisition",
    title: "Имейл маркетинг",
    icon: "Mail",
    steps: [
      {
        title: "Lead Magnet",
        assignee: "",
        actions: [
          { text: "Създаване на безплатен ресурс (PDF, checklist, видео)", done: false },
          { text: "Дизайн на cover и вътрешни страници", done: false },
          { text: "Настройка на автоматично изпращане", done: false },
        ],
      },
      {
        title: "Landing Page",
        assignee: "",
        actions: [
          { text: "Създаване на opt-in страница", done: false },
          { text: "A/B тест на заглавия и бутони", done: false },
          { text: "Свързване с email платформа (Mailchimp/ConvertKit)", done: false },
        ],
      },
      {
        title: "Welcome последователност",
        assignee: "",
        actions: [
          { text: "Email 1: Добре дошли + доставка на lead magnet", done: false },
          { text: "Email 2: Представяне на бранда (история)", done: false },
          { text: "Email 3: Стойност + полезно съдържание", done: false },
          { text: "Email 4: Social proof + testimonials", done: false },
          { text: "Email 5: Оферта/CTA", done: false },
        ],
      },
      {
        title: "Седмичен newsletter",
        assignee: "",
        actions: [
          { text: "Определяне на тема (полезна за аудиторията)", done: false },
          { text: "Написване и дизайн на имейла", done: false },
          { text: "Изпращане в оптимален ден/час", done: false },
          { text: "Анализ на open rate и click rate", done: false },
        ],
      },
    ],
  },
  {
    id: "website",
    category: "acquisition",
    title: "Уебсайт & SEO",
    icon: "Globe",
    steps: [
      {
        title: "SEO оптимизация",
        assignee: "",
        actions: [
          { text: "Keyword research (основни + long-tail)", done: false },
          { text: "On-page SEO (title tags, meta descriptions, H1-H3)", done: false },
          { text: "Техническо SEO (скорост, mobile-first, sitemap)", done: false },
          { text: "Schema markup за rich snippets", done: false },
        ],
      },
      {
        title: "Блог съдържание",
        assignee: "",
        actions: [
          { text: "Публикуване на 2-4 статии месечно", done: false },
          { text: "Оптимизация на всяка статия за целева ключова дума", done: false },
          { text: "Вътрешно линкване между статиите", done: false },
        ],
      },
      {
        title: "Google My Business",
        assignee: "",
        actions: [
          { text: "Създаване/оптимизация на GMB профил", done: false },
          { text: "Добавяне на снимки и работно време", done: false },
          { text: "Събиране на Google отзиви (5+ на месец)", done: false },
        ],
      },
    ],
  },
  {
    id: "referral",
    category: "acquisition",
    title: "Препоръки",
    icon: "MessageCircle",
    steps: [
      {
        title: "Програма за препоръки",
        assignee: "",
        actions: [
          { text: "Създаване на реферална система с награди", done: false },
          { text: "Промоция на програмата към съществуващи клиенти", done: false },
          { text: "Автоматизиране на tracking и награди", done: false },
        ],
      },
      {
        title: "Отзиви и testimonials",
        assignee: "",
        actions: [
          { text: "Искане на отзив 7 дни след покупка", done: false },
          { text: "Видео testimonials от доволни клиенти", done: false },
          { text: "Публикуване на отзиви на сайта и соц. мрежи", done: false },
        ],
      },
      {
        title: "Партньорства",
        assignee: "",
        actions: [
          { text: "Идентифициране на complementary бизнеси", done: false },
          { text: "Предложение за кръстосана промоция", done: false },
          { text: "Съвместни events или оферти", done: false },
        ],
      },
    ],
  },
  {
    id: "landing-page",
    category: "conversion",
    title: "Landing Page фуния",
    icon: "Target",
    steps: [
      {
        title: "Заглавие и Hook",
        assignee: "",
        actions: [
          { text: "Написване на headline с ясна полза", done: false },
          { text: "Подзаглавие с конкретно обещание", done: false },
          { text: "Hero image/video", done: false },
        ],
      },
      {
        title: "Социално доказателство",
        assignee: "",
        actions: [
          { text: "Добавяне на 3-5 testimonials с снимки", done: false },
          { text: "Числа и статистики (X клиенти, Y% резултат)", done: false },
          { text: "Лога на партньори/медии", done: false },
        ],
      },
      {
        title: "CTA и формуляр",
        assignee: "",
        actions: [
          { text: "Ясен бутон с action text (не 'Submit')", done: false },
          { text: "Минимум полета във формуляра", done: false },
          { text: "Urgency елементи (countdown, limited spots)", done: false },
        ],
      },
      {
        title: "Follow-up",
        assignee: "",
        actions: [
          { text: "Автоматичен email след попълване на формуляр", done: false },
          { text: "Обаждане до 5 мин. за горещи leads", done: false },
          { text: "Retargeting реклами за незавършили", done: false },
        ],
      },
    ],
  },
  {
    id: "sales-call",
    category: "conversion",
    title: "Продажбено обаждане",
    icon: "MessageCircle",
    steps: [
      {
        title: "Квалифициране на лийда",
        assignee: "",
        actions: [
          { text: "Проверка дали отговаря на ICP (Ideal Customer Profile)", done: false },
          { text: "Бюджет, нужда, времеви рамки", done: false },
          { text: "Scoring на лийда (hot/warm/cold)", done: false },
        ],
      },
      {
        title: "Discovery Call",
        assignee: "",
        actions: [
          { text: "Разбиране на болките и целите на клиента", done: false },
          { text: "Задаване на SPIN въпроси", done: false },
          { text: "Записване на notes в CRM", done: false },
        ],
      },
      {
        title: "Презентация на решението",
        assignee: "",
        actions: [
          { text: "Показване как продуктът решава конкретните проблеми", done: false },
          { text: "Demo/визуализация на резултата", done: false },
          { text: "Case study от подобен клиент", done: false },
        ],
      },
      {
        title: "Затваряне на сделката",
        assignee: "",
        actions: [
          { text: "Обработка на възражения (цена, време, конкуренция)", done: false },
          { text: "Оферта с deadline", done: false },
          { text: "Изпращане на договор/фактура", done: false },
          { text: "Follow-up ако няма отговор до 48ч", done: false },
        ],
      },
    ],
  },
  {
    id: "direct-sale",
    category: "revenue",
    title: "Директна продажба",
    icon: "ShoppingCart",
    steps: [
      {
        title: "Продуктова страница",
        assignee: "",
        actions: [
          { text: "Професионални снимки на продукта", done: false },
          { text: "Описание с ползи (не само характеристики)", done: false },
          { text: "Цена + варианти (ако има)", done: false },
          { text: "FAQ секция", done: false },
        ],
      },
      {
        title: "Checkout процес",
        assignee: "",
        actions: [
          { text: "Минимум стъпки (1-2 страници)", done: false },
          { text: "Множество методи за плащане (карта, PayPal)", done: false },
          { text: "Trust badges и SSL", done: false },
          { text: "Abandoned cart email (след 1ч, 24ч)", done: false },
        ],
      },
      {
        title: "След покупката",
        assignee: "",
        actions: [
          { text: "Потвърждение + фактура по имейл", done: false },
          { text: "Thank you page с upsell оферта", done: false },
          { text: "Проследяване на доставката", done: false },
          { text: "Искане на отзив след получаване", done: false },
        ],
      },
    ],
  },
  {
    id: "subscription",
    category: "revenue",
    title: "Абонамент",
    icon: "CreditCard",
    steps: [
      {
        title: "Безплатен пробен период",
        assignee: "",
        actions: [
          { text: "7/14/30 дни free trial", done: false },
          { text: "Onboarding email последователност", done: false },
          { text: "In-app tutorial при първо влизане", done: false },
        ],
      },
      {
        title: "Конвертиране в платен",
        assignee: "",
        actions: [
          { text: "Reminder email 3 дни преди край на trial", done: false },
          { text: "Показване на стойността (какво ще загубят)", done: false },
          { text: "Специална оферта за annual план", done: false },
        ],
      },
      {
        title: "Upsell",
        assignee: "",
        actions: [
          { text: "Предлагане на по-висок план при лимити", done: false },
          { text: "Add-on продукти/функции", done: false },
          { text: "Annual vs monthly отстъпка", done: false },
        ],
      },
    ],
  },
  {
    id: "upsell",
    category: "revenue",
    title: "Upsell & Cross-sell",
    icon: "TrendingUp",
    steps: [
      {
        title: "Post-purchase upsell",
        assignee: "",
        actions: [
          { text: "One-click upsell на thank you page", done: false },
          { text: "Допълнителен продукт със специална цена", done: false },
          { text: "Бъндъл оферта ('добави X за само Y лв')", done: false },
        ],
      },
      {
        title: "Cross-sell",
        assignee: "",
        actions: [
          { text: "Email с персонализирани препоръки", done: false },
          { text: "'Клиенти купиха също...' секция", done: false },
          { text: "Сезонни/тематични бъндъли", done: false },
        ],
      },
    ],
  },
  {
    id: "loyalty",
    category: "retention",
    title: "Лоялност",
    icon: "Star",
    steps: [
      {
        title: "Програма за лоялност",
        assignee: "",
        actions: [
          { text: "Точки за всяка покупка", done: false },
          { text: "Нива (Bronze, Silver, Gold, VIP)", done: false },
          { text: "Награди при достигане на ниво", done: false },
          { text: "Birthday бонус/отстъпка", done: false },
        ],
      },
      {
        title: "Ексклузивност",
        assignee: "",
        actions: [
          { text: "Ранен достъп до нови продукти", done: false },
          { text: "VIP-only оферти и събития", done: false },
          { text: "Персонален мениджър за топ клиенти", done: false },
        ],
      },
    ],
  },
  {
    id: "reengagement",
    category: "retention",
    title: "Реактивиране",
    icon: "Gift",
    steps: [
      {
        title: "Win-back кампания",
        assignee: "",
        actions: [
          { text: "Email на 30 дни неактивност ('Липсвате ни')", done: false },
          { text: "Email на 60 дни ('Специална оферта за вас')", done: false },
          { text: "Email на 90 дни ('Последен шанс' + голяма отстъпка)", done: false },
        ],
      },
      {
        title: "Обратна връзка",
        assignee: "",
        actions: [
          { text: "NPS анкета на всеки 3 месеца", done: false },
          { text: "Exit survey при отписване", done: false },
          { text: "1-on-1 интервюта с топ клиенти", done: false },
        ],
      },
    ],
  },
];

function getIcon(name: string) {
  const icons: Record<string, any> = {
    Share2, Megaphone, Mail, Globe, MessageCircle, Target, ShoppingCart, CreditCard, TrendingUp, Star, Gift, Users, DollarSign, Repeat,
  };
  return icons[name] || Target;
}

// --- Step Detail Panel ---
function StepDetail({
  step,
  stepIndex,
  color,
  onUpdate,
  teamMembers,
  botSkills,
  onAddToTasks,
}: {
  step: ProcessStep;
  stepIndex: number;
  color: string;
  onUpdate: (updated: ProcessStep) => void;
  teamMembers: string[];
  botSkills: BotSkillInfo[];
  onAddToTasks: (title: string, assignee?: string) => void;
}) {
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editingActionAssignee, setEditingActionAssignee] = useState<number | null>(null);
  const [newAction, setNewAction] = useState("");
  const [expandedResults, setExpandedResults] = useState<Record<number, boolean>>({});

  // Execute action via AI with the assigned bot's persona
  const executeAction = async (actionIndex: number) => {
    const action = step.actions[actionIndex];
    if (action.running) return;

    // Find bot info for assignee
    const botInfo = action.assignee
      ? botSkills.find(b => `🤖 ${b.name}` === action.assignee)
      : null;

    // Mark as running
    const runningUpdate = { ...step, actions: step.actions.map((a, i) => i === actionIndex ? { ...a, running: true } : a) };
    onUpdate(runningUpdate);

    try {
      const persona = botInfo
        ? `Ти си ${botInfo.name}, специалист в: ${botInfo.skills.join(", ")}.`
        : action.assignee
          ? `Ти работиш като ${action.assignee}.`
          : `Ти си бизнес асистент.`;

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `${persona} Стъпка от процеса "${step.title}": Изпълни това действие и дай кратък отчет (макс 3 изречения). Ако не можеш, обясни какво ти трябва:\n\n"${action.text}"`,
            },
          ],
          context: "business",
        },
      });

      const result = error
        ? "Грешка при изпълнение"
        : data?.content || "Задачата е изпълнена.";

      const isSuccess = !error && !result.toLowerCase().includes("не мога") && !result.toLowerCase().includes("нямам достъп");

      const doneUpdate = {
        ...step,
        actions: step.actions.map((a, i) =>
          i === actionIndex ? { ...a, done: isSuccess, running: false, result } : a
        ),
      };
      onUpdate(doneUpdate);
      setExpandedResults(prev => ({ ...prev, [actionIndex]: true }));

      if (isSuccess) {
        toast.success(`${action.assignee || "AI"} завърши: "${action.text.substring(0, 40)}..."`);
      }
    } catch {
      const errUpdate = {
        ...step,
        actions: step.actions.map((a, i) =>
          i === actionIndex ? { ...a, running: false, result: "Грешка при връзката с AI" } : a
        ),
      };
      onUpdate(errUpdate);
    }
  };

  const setActionAssignee = (actionIndex: number, assignee: string) => {
    const updated = { ...step, actions: step.actions.map((a, i) => i === actionIndex ? { ...a, assignee: assignee || undefined } : a) };
    onUpdate(updated);
    setEditingActionAssignee(null);
  };

  const addAction = () => {
    if (!newAction.trim()) return;
    onUpdate({ ...step, actions: [...step.actions, { text: newAction.trim(), done: false }] });
    setNewAction("");
  };

  const removeAction = (actionIndex: number) => {
    onUpdate({ ...step, actions: step.actions.filter((_, i) => i !== actionIndex) });
  };

  // Find matching bots for an action based on skill keywords
  const getMatchingMembers = (actionText: string) => {
    const text = actionText.toLowerCase();
    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const member of teamMembers) {
      const botInfo = botSkills.find(b => `🤖 ${b.name}` === member);
      if (botInfo && botInfo.skills.length > 0) {
        const hasSkill = botInfo.skills.some(skill =>
          text.includes(skill.toLowerCase()) || skill.toLowerCase().includes(text.substring(0, 10))
        );
        if (hasSkill) matched.push(member);
        else unmatched.push(member);
      } else {
        // Human members always available
        matched.push(member);
      }
    }
    return { matched, unmatched };
  };

  const doneCount = step.actions.filter(a => a.done).length;
  const progress = step.actions.length > 0 ? (doneCount / step.actions.length) * 100 : 0;

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `2px solid ${color}20` }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {stepIndex + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{step.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[120px]">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: color }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{doneCount}/{step.actions.length}</span>
          </div>
        </div>

        {/* Step Assignee */}
        <div className="shrink-0">
          {editingAssignee ? (
            <div className="flex items-center gap-1">
              <select
                className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
                value={step.assignee}
                onChange={e => { onUpdate({ ...step, assignee: e.target.value }); setEditingAssignee(false); }}
              >
                <option value="">Без отговорник</option>
                {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={() => setEditingAssignee(false)} className="p-0.5"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditingAssignee(true)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all",
                step.assignee
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              <UserCircle className="w-3.5 h-3.5" />
              {step.assignee || "Задай отговорник"}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 space-y-0.5">
        {step.actions.map((action, i) => {
          const { matched, unmatched } = getMatchingMembers(action.text);

          const showResult = expandedResults[i];

          return (
            <div key={i} className="py-1.5 group">
              <div className="flex items-start gap-2">
                {/* Execute button */}
                <button
                  onClick={() => executeAction(i)}
                  disabled={action.running}
                  className={cn(
                    "mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all",
                    action.running
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40"
                      : action.done
                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/40"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                  title="Изпълни"
                >
                  {action.running ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : action.done ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm", action.done && "text-muted-foreground/70")}>
                    {action.text}
                  </span>
                </div>

                {/* Action Assignee + result toggle */}
                <div className="shrink-0 flex items-center gap-1">
                  {action.result && (
                    <button
                      className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setExpandedResults(prev => ({ ...prev, [i]: !prev[i] }))}
                      title={showResult ? "Скрий резултат" : "Виж резултат"}
                    >
                      {showResult ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}
                  {editingActionAssignee === i ? (
                    <select
                      className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background max-w-[140px]"
                      value={action.assignee || ""}
                      onChange={e => setActionAssignee(i, e.target.value)}
                      onBlur={() => setEditingActionAssignee(null)}
                      autoFocus
                    >
                      <option value="">—</option>
                      {matched.length > 0 && (
                        <optgroup label="Препоръчани">
                          {matched.map(m => <option key={m} value={m}>{m}</option>)}
                        </optgroup>
                      )}
                      {unmatched.length > 0 && (
                        <optgroup label="Други">
                          {unmatched.map(m => <option key={m} value={m}>{m}</option>)}
                        </optgroup>
                      )}
                    </select>
                  ) : action.assignee ? (
                    <button
                      onClick={() => setEditingActionAssignee(i)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all truncate max-w-[100px]"
                      title={action.assignee}
                    >
                      {action.assignee}
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingActionAssignee(i)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground hover:bg-secondary transition-all whitespace-nowrap"
                    >
                      + Възложи
                    </button>
                  )}
                  <button
                    onClick={() => onAddToTasks(action.text, action.assignee?.replace("🤖 ", ""))}
                    className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all whitespace-nowrap flex items-center gap-0.5"
                    title="Добави като задача"
                  >
                    <ListTodo className="w-2.5 h-2.5" />
                    Задача
                  </button>
                  <button
                    onClick={() => removeAction(i)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-all shrink-0"
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>

              {/* AI Result */}
              {action.result && showResult && (
                <div className={cn(
                  "ml-7 mt-1 p-2 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap",
                  action.done
                    ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-800/30"
                    : "bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30"
                )}>
                  {action.result}
                </div>
              )}
              {action.result && !showResult && (
                <div className={cn(
                  "ml-7 mt-0.5 text-[10px] flex items-center gap-1",
                  action.done ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                )}>
                  {action.done ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                  <span className="truncate max-w-[250px]">
                    {action.result.length > 60 ? action.result.substring(0, 60) + "..." : action.result}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Add action */}
        <div className="flex items-center gap-2 pt-1 pb-1">
          <input
            type="text"
            placeholder="Добави действие..."
            value={newAction}
            onChange={e => setNewAction(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addAction()}
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
          />
          {newAction && (
            <button onClick={addAction} className="p-1 rounded-lg hover:bg-secondary transition-all">
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function MindMapPage() {
  const { user } = useAuth();
  const { tasks, addTask } = useTasks();
  const { currentOrganization } = useOrganizations();
  const [connectedApis, setConnectedApis] = useState<Set<string>>(new Set());
  const [processes, setProcesses] = useState<ProcessData[]>(DEFAULT_PROCESSES);
  const [selectedProcess, setSelectedProcess] = useState<ProcessData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("acquisition");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSteps, setNewSteps] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [teamMembers, setTeamMembers] = useState<string[]>(["Симо", "Данаил"]);
  const [botSkillsData, setBotSkillsData] = useState<BotSkillInfo[]>([]);
  const [newMember, setNewMember] = useState("");
  const [showMemberInput, setShowMemberInput] = useState(false);

  // Load
  useEffect(() => {
    const saved = localStorage.getItem(`mindmap-v2-${user?.id}`);
    if (saved) {
      try { setProcesses(JSON.parse(saved)); } catch { /* defaults */ }
    }
    const savedMembers = localStorage.getItem(`mindmap-members-${user?.id}`);
    if (savedMembers) {
      try { setTeamMembers(JSON.parse(savedMembers)); } catch { /* defaults */ }
    }
    // Load AI bots with skills
    try {
      const botsJson = localStorage.getItem("simora_ai_bots");
      if (botsJson) {
        const bots = JSON.parse(botsJson);
        const botNames = bots.map((b: { name: string }) => `🤖 ${b.name}`);
        const skills: BotSkillInfo[] = bots.map((b: { name: string; skills?: string[] }) => ({
          name: b.name,
          skills: b.skills || [],
        }));
        setBotSkillsData(skills);
        setTeamMembers(prev => {
          const existing = new Set(prev);
          const merged = [...prev];
          for (const name of botNames) {
            if (!existing.has(name)) merged.push(name);
          }
          return merged;
        });
      }
    } catch { /* ignore */ }
  }, [user?.id]);

  // Automatable processes with required integrations
  const AUTOMATIONS = [
    { id: "auto-email-welcome", title: "Автоматичен welcome имейл", description: "При нова регистрация/заявка", requiredApi: "resend", icon: Mail, category: "Email" },
    { id: "auto-email-nurture", title: "Drip email последователност", description: "5 имейла за нови абонати", requiredApi: "resend", icon: Mail, category: "Email" },
    { id: "auto-newsletter", title: "Седмичен newsletter", description: "Автоматично изпращане всеки петък", requiredApi: "resend", icon: Mail, category: "Email" },
    { id: "auto-abandoned", title: "Имейл за изоставена количка", description: "Автоматичен follow-up", requiredApi: "resend", icon: Mail, category: "Email" },
    { id: "auto-meta-ads", title: "Meta Ads кампании", description: "Facebook & Instagram реклами", requiredApi: "meta", icon: Megaphone, category: "Реклама" },
    { id: "auto-google-ads", title: "Google Ads кампании", description: "Search & Display мрежа", requiredApi: "google_ads", icon: Megaphone, category: "Реклама" },
    { id: "auto-retargeting", title: "Retargeting аудитории", description: "Pixel/CAPI базиран ретаргетинг", requiredApi: "meta", icon: Target, category: "Реклама" },
    { id: "auto-stripe-checkout", title: "Stripe плащания", description: "Автоматичен checkout и фактури", requiredApi: "stripe", icon: CreditCard, category: "Продажби" },
    { id: "auto-stripe-subscription", title: "Stripe абонаменти", description: "Recurring плащания", requiredApi: "stripe", icon: CreditCard, category: "Продажби" },
    { id: "auto-ghl-leads", title: "CRM лийд тракинг", description: "Автоматично добавяне в GoHighLevel", requiredApi: "ghl", icon: Users, category: "CRM" },
    { id: "auto-ghl-followup", title: "CRM follow-up автоматизации", description: "Автоматични SMS/имейл", requiredApi: "ghl", icon: Users, category: "CRM" },
    { id: "auto-analytics", title: "Google Analytics отчети", description: "Автоматични седмични отчети", requiredApi: "google_analytics", icon: TrendingUp, category: "Анализи" },
    { id: "auto-uptime", title: "Uptime мониторинг", description: "24/7 проверка на сайтове", requiredApi: "none", icon: Globe, category: "Технически" },
    { id: "auto-seo-audit", title: "SEO одит", description: "Автоматична проверка на позиции", requiredApi: "google_search", icon: Globe, category: "SEO" },
    { id: "auto-social-schedule", title: "Публикуване в соц. мрежи", description: "Автоматично по график", requiredApi: "meta", icon: Share2, category: "Соц. мрежи" },
    { id: "auto-chatbot", title: "AI чатбот за сайт", description: "Автоматични отговори на клиенти", requiredApi: "none", icon: MessageCircle, category: "Технически" },
  ];

  // Check which APIs are connected
  useEffect(() => {
    if (!user) return;
    const connected = new Set<string>();

    // Always available (built-in)
    connected.add("none");

    // Check Resend (localStorage)
    try {
      const resend = localStorage.getItem(`simora_resend_settings_${user.id}`);
      if (resend) {
        const parsed = JSON.parse(resend);
        if (parsed.apiKey) connected.add("resend");
      }
    } catch { /* ignore */ }

    // Check GHL
    (async () => {
      const { data: ghl } = await supabase
        .from("ghl_integrations")
        .select("api_key")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ghl?.api_key) connected.add("ghl");

      // Check org integrations (Stripe, Meta, etc.)
      if (currentOrganization?.id) {
        const { data: integrations } = await supabase
          .from("organization_integrations")
          .select("integration_type, api_key, is_active")
          .eq("organization_id", currentOrganization.id);

        if (integrations) {
          for (const int of integrations) {
            if (int.api_key && int.is_active) {
              connected.add(int.integration_type);
            }
          }
        }
      }

      setConnectedApis(new Set(connected));
    })();
  }, [user, currentOrganization?.id]);

  // Save
  const save = useCallback((procs: ProcessData[]) => {
    setProcesses(procs);
    if (user?.id) localStorage.setItem(`mindmap-v2-${user.id}`, JSON.stringify(procs));
  }, [user?.id]);

  const saveMembers = useCallback((members: string[]) => {
    setTeamMembers(members);
    if (user?.id) localStorage.setItem(`mindmap-members-${user.id}`, JSON.stringify(members));
  }, [user?.id]);

  const updateStep = (processId: string, stepIndex: number, updatedStep: ProcessStep) => {
    const updated = processes.map(p =>
      p.id === processId
        ? { ...p, steps: p.steps.map((s, i) => i === stepIndex ? updatedStep : s) }
        : p
    );
    save(updated);
    if (selectedProcess?.id === processId) {
      setSelectedProcess(updated.find(p => p.id === processId) || null);
    }
  };

  const addProcess = () => {
    if (!newTitle.trim()) return;
    const stepTitles = newSteps.split("\n").filter(s => s.trim());
    if (stepTitles.length === 0) { toast.error("Добавете поне една стъпка"); return; }
    const np: ProcessData = {
      id: `custom-${Date.now()}`,
      category: selectedCategory,
      title: newTitle.trim(),
      icon: "Target",
      steps: stepTitles.map(t => ({ title: t.trim(), assignee: "", actions: [] })),
    };
    save([...processes, np]);
    setSelectedProcess(np);
    setIsAddingNew(false);
    setNewTitle("");
    setNewSteps("");
    toast.success("Процесът е добавен!");
  };

  const deleteProcess = (id: string) => {
    save(processes.filter(p => p.id !== id));
    if (selectedProcess?.id === id) setSelectedProcess(null);
    toast.success("Процесът е изтрит");
  };

  const currentCategory = CATEGORIES.find(c => c.id === selectedCategory);
  const categoryProcesses = processes.filter(p => p.category === selectedCategory);

  // Calculate progress for a process
  const getProcessProgress = (proc: ProcessData) => {
    const total = proc.steps.reduce((sum, s) => sum + s.actions.length, 0);
    const done = proc.steps.reduce((sum, s) => sum + s.actions.filter(a => a.done).length, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left sidebar - categories & processes */}
        <div className="w-80 border-r border-border bg-card/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold mb-2 px-1">Бизнес процеси</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setSelectedProcess(null); }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                      selectedCategory === cat.id
                        ? "text-white shadow-lg"
                        : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                    )}
                    style={selectedCategory === cat.id ? { backgroundColor: cat.color } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {currentCategory && (
            <div className="px-4 py-2 border-b border-border/50">
              <p className="text-[11px] text-muted-foreground">{currentCategory.description}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {categoryProcesses.map(proc => {
              const Icon = getIcon(proc.icon);
              const progress = getProcessProgress(proc);
              const isSelected = selectedProcess?.id === proc.id;
              return (
                <button
                  key={proc.id}
                  onClick={() => setSelectedProcess(proc)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all group",
                    isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/80 border border-transparent"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${currentCategory?.color}15`, color: currentCategory?.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{proc.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: currentCategory?.color }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{progress}%</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProcess(proc.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </button>
              );
            })}
          </div>

          {/* Add process + team */}
          <div className="p-3 border-t border-border space-y-2">
            {isAddingNew ? (
              <div className="space-y-2">
                <Input placeholder="Име на процеса..." value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-8 text-sm rounded-xl" />
                <Textarea placeholder="Стъпки (по една на ред)..." value={newSteps} onChange={e => setNewSteps(e.target.value)} rows={3} className="text-xs rounded-xl resize-none" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addProcess} className="flex-1 rounded-xl h-7 text-xs"><Save className="w-3 h-3 mr-1" />Запази</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsAddingNew(false); setNewTitle(""); setNewSteps(""); }} className="rounded-xl h-7 text-xs"><X className="w-3 h-3" /></Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsAddingNew(true)} className="w-full rounded-xl h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />Добави процес
              </Button>
            )}

            {/* Team members */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Екип</span>
                <button onClick={() => setShowMemberInput(!showMemberInput)} className="p-0.5 hover:bg-secondary rounded">
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              {showMemberInput && (
                <div className="flex gap-1 mb-1">
                  <Input placeholder="Име..." value={newMember} onChange={e => setNewMember(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newMember.trim()) { saveMembers([...teamMembers, newMember.trim()]); setNewMember(""); setShowMemberInput(false); } }}
                    className="h-6 text-xs rounded-lg" />
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {teamMembers.map(m => (
                  <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-lg text-[11px] group">
                    <UserCircle className="w-3 h-3" />{m}
                    <button onClick={() => saveMembers(teamMembers.filter(t => t !== m))} className="opacity-0 group-hover:opacity-100">
                      <X className="w-2.5 h-2.5 text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main content - process steps */}
        <div className="flex-1 overflow-y-auto bg-background">
          {selectedProcess ? (
            <div className="max-w-4xl mx-auto p-6">
              {/* Process header */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${currentCategory?.color}15`, color: currentCategory?.color }}
                >
                  {(() => { const I = getIcon(selectedProcess.icon); return <I className="w-6 h-6" />; })()}
                </div>
                <div className="flex-1">
                  {editingTitle === selectedProcess.id ? (
                    <div className="flex items-center gap-2">
                      <Input value={editTitleValue} onChange={e => setEditTitleValue(e.target.value)}
                        className="h-9 text-lg font-semibold rounded-xl" />
                      <Button size="sm" className="rounded-xl" onClick={() => {
                        const updated = processes.map(p => p.id === selectedProcess.id ? { ...p, title: editTitleValue } : p);
                        save(updated);
                        setSelectedProcess({ ...selectedProcess, title: editTitleValue });
                        setEditingTitle(null);
                      }}><Save className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditingTitle(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold">{selectedProcess.title}</h1>
                      <button onClick={() => { setEditingTitle(selectedProcess.id); setEditTitleValue(selectedProcess.title); }}
                        className="p-1 hover:bg-secondary rounded-lg opacity-50 hover:opacity-100 transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedProcess.steps.length} стъпки · {getProcessProgress(selectedProcess)}% завършен
                  </p>
                </div>
              </div>

              {/* Flow visualization - horizontal */}
              <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
                {selectedProcess.steps.map((step, i) => {
                  const done = step.actions.length > 0 && step.actions.every(a => a.done);
                  const partial = step.actions.some(a => a.done);
                  return (
                    <div key={i} className="flex items-center shrink-0">
                      <div
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer",
                          done ? "text-white" : partial ? "bg-card" : "bg-card"
                        )}
                        style={{
                          borderColor: currentCategory?.color,
                          backgroundColor: done ? currentCategory?.color : undefined,
                          color: done ? "#fff" : currentCategory?.color,
                        }}
                        onClick={() => {
                          document.getElementById(`step-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                      >
                        {step.title}
                        {step.assignee && (
                          <span className="ml-1.5 opacity-70">· {step.assignee}</span>
                        )}
                      </div>
                      {i < selectedProcess.steps.length - 1 && (
                        <ArrowRight className="w-4 h-4 mx-1 shrink-0" style={{ color: currentCategory?.color }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step details */}
              <div className="space-y-4">
                {selectedProcess.steps.map((step, i) => (
                  <div key={i} id={`step-${i}`}>
                    <StepDetail
                      step={step}
                      stepIndex={i}
                      color={currentCategory?.color || "#3b82f6"}
                      teamMembers={teamMembers}
                      botSkills={botSkillsData}
                      onUpdate={(updated) => updateStep(selectedProcess.id, i, updated)}
                      onAddToTasks={(title, assignee) => {
                        const alreadyExists = tasks.some(t => t.title === title && t.status !== "done");
                        if (alreadyExists) {
                          toast.info("Тази задача вече съществува");
                          return;
                        }
                        addTask({
                          title,
                          assignee_name: assignee || null,
                          priority: "medium",
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
                  <Target className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium">Изберете процес от менюто</p>
                <p className="text-sm text-muted-foreground/70">Кликнете върху процес, за да видите стъпките и действията</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automations Section */}
      <div className="border-t border-border bg-card/50 px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-display font-semibold">Автоматизации</h2>
            <span className="text-xs text-muted-foreground ml-2">
              {AUTOMATIONS.filter(a => connectedApis.has(a.requiredApi)).length}/{AUTOMATIONS.length} свързани
            </span>
          </div>

          {/* Group by category */}
          {(() => {
            const categories = [...new Set(AUTOMATIONS.map(a => a.category))];
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AUTOMATIONS.map(auto => {
                  const isConnected = connectedApis.has(auto.requiredApi);
                  const Icon = auto.icon;
                  const apiLabels: Record<string, string> = {
                    resend: "Resend API",
                    meta: "Meta Business API",
                    google_ads: "Google Ads API",
                    stripe: "Stripe API",
                    ghl: "GoHighLevel API",
                    google_analytics: "Google Analytics API",
                    google_search: "Google Search Console",
                    none: "Вградено",
                  };
                  return (
                    <div
                      key={auto.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border transition-all",
                        isConnected
                          ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30"
                          : "bg-red-50/50 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        isConnected
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                          : "bg-red-100 dark:bg-red-900/40 text-red-500"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          !isConnected && "text-red-700 dark:text-red-400"
                        )}>
                          {auto.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{auto.description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {isConnected ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <Link2 className="w-2.5 h-2.5" />
                              {apiLabels[auto.requiredApi] || auto.requiredApi}
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Свържете {apiLabels[auto.requiredApi] || auto.requiredApi}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </MainLayout>
  );
}
