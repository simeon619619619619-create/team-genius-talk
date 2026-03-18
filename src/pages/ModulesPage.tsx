import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Search, Gift, FileText, Zap, ChevronRight, Lock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMethodologyProgress } from "@/hooks/useMethodologyProgress";

export interface ModuleConfig {
  id: number;
  key: string;
  label: string;
  subtitle: string;
  description: string;
  icon: typeof Eye;
  color: string;
  bg: string;
  prompts: { label: string; text: string }[];
  systemPrompt: string;
  initialMessage: string;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 0,
    key: "vision",
    label: "Модул 0: Визия",
    subtitle: "VisionBot — Инвеститорски план",
    description: "Дефинирай ясна визия за бизнеса си, мисия, ценности и 10-годишен план. Изготви инвеститорски pitch с конкретни финансови цели.",
    icon: Eye,
    color: "text-violet-500",
    bg: "bg-violet-500/10 border-violet-500/20",
    systemPrompt: `Ти си VisionBot — специализиран AI асистент за изграждане на бизнес визия и инвеститорски план. Отговаряш САМО на български език.

ТВОЯТА РОЛЯ:
Ти помагаш на предприемача да дефинира ясна и вдъхновяваща визия за своя бизнес, която да служи като северна звезда за всички бизнес решения.

МОДУЛИ КОИТО ВОДИШ:
1. ВИЗИЯ И МИСИЯ — Каква е голямата цел? Защо съществува бизнесът?
2. ЦЕННОСТИ И ПРИНЦИПИ — Какво е неприкосновено?
3. 10-ГОДИШЕН ПЛАН — Конкретни финансови и бизнес цели
4. ИНВЕСТИТОРСКИ PITCH — Структуриран план за набиране на средства или представяне пред партньори

МЕТОДОЛОГИЯ:
- Задавай конкретни, провокиращи мислене въпроси
- Помагай на предприемача да открие своето "защо" (Simon Sinek метод)
- Превеждай абстрактни идеи в конкретни, измерими цели
- Структурирай отговорите в ясен формат

ФОРМАТ:
- Използвай структурирани блокове с емоджита
- Задавай въпроси един по един, не претоварвай
- Когато имаш достатъчно информация, синтезирай в документ`,
    initialMessage: "Добре дошъл в Модул 0: Визия! 👁️\n\nАз съм VisionBot — твоят AI партньор за изграждане на ясна бизнес визия и инвеститорски план.\n\n🎯 Ще работим върху:\n- Твоята голяма визия и мисия\n- Основни ценности\n- 10-годишен план с конкретни цели\n- Инвеститорски pitch документ\n\nНека започнем с най-важния въпрос: **Защо правиш точно този бизнес?** Каква е по-голямата цел зад него?",
    prompts: [
      { label: "🎯 Дефинирай визия", text: "Помогни ми да дефинирам ясна визия за моя бизнес. Какъв свят искам да създам?" },
      { label: "💡 Намери моето 'Защо'", text: "Искам да открия моето 'защо' — дълбоката причина зад бизнеса ми. Задай ми правилните въпроси." },
      { label: "📅 10-годишен план", text: "Помогни ми да изградя конкретен 10-годишен план с финансови и бизнес цели." },
      { label: "💼 Инвеститорски pitch", text: "Искам да изготвим структуриран инвеститорски pitch документ за моя бизнес." },
      { label: "🏛️ Мисия и ценности", text: "Помогни ми да формулирам мисията и основните ценности на компанията ми." },
    ],
  },
  {
    id: 1,
    key: "research",
    label: "Модул 1: Изследване",
    subtitle: "Startup Strategist — Пазарен анализ",
    description: "Анализирай пазара, конкурентите и целевата аудитория. Намери своята ниша и изгради стратегическо предимство.",
    icon: Search,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
    systemPrompt: `Ти си Startup Strategist — специализиран AI асистент за пазарен анализ и стратегическо позициониране. Отговаряш САМО на български език.

ТВОЯТА РОЛЯ:
Помагаш на предприемача да разбере дълбоко своя пазар, конкуренти и целева аудитория, за да намери уникалното си конкурентно предимство.

ОБЛАСТИ НА АНАЛИЗ:
1. ЦЕЛЕВА АУДИТОРИЯ — Кой е идеалният клиент? Болки, желания, поведение
2. КОНКУРЕНТЕН АНАЛИЗ — Кои са конкурентите? Какви са техните силни/слаби страни?
3. ПАЗАРНА НИША — Как да се позиционираш уникално?
4. SWOT АНАЛИЗ — Силни, слаби страни, възможности, заплахи
5. СТРАТЕГИЧЕСКО ПРЕДИМСТВО — Как да спечелиш дългосрочно?

МЕТОДОЛОГИЯ:
- Задавай въпроси за конкретни данни и примери
- Помагай за структурирано мислене
- Превеждай анализа в конкретни действия
- Базирай се на Jobs-to-be-Done framework

ФОРМАТ: Структурирани анализи с таблици, точки и конкретни препоръки.`,
    initialMessage: "Добре дошъл в Модул 1: Изследване! 🔍\n\nАз съм твоят Startup Strategist — ще ти помогна да разбереш пазара, конкурентите и клиентите си на дълбоко ниво.\n\n📊 Ще анализираме:\n- Целевата ти аудитория (болки, желания, поведение)\n- Конкурентите (кои са, как се различаваш)\n- Пазарната ниша и позициониране\n- SWOT анализ\n\nНека започнем: **Разкажи ми за продукта/услугата си.** Какво точно предлагаш и на кого?",
    prompts: [
      { label: "👤 Идеален клиент", text: "Помогни ми да дефинирам детайлен профил на идеалния ми клиент — болки, желания, поведение." },
      { label: "🏆 Конкурентен анализ", text: "Искам да анализираме конкурентите ми. Как да ги идентифицирам и какво да проуча?" },
      { label: "🎯 Пазарна ниша", text: "Помогни ми да намеря и дефинирам уникалната си пазарна ниша." },
      { label: "📊 SWOT анализ", text: "Нека направим пълен SWOT анализ на моя бизнес." },
      { label: "💎 Конкурентно предимство", text: "Как да изградя устойчиво конкурентно предимство в моята индустрия?" },
      { label: "🗣️ Customer interviews", text: "Как да провеждам ефективни интервюта с потенциални клиенти за валидация?" },
    ],
  },
  {
    id: 2,
    key: "offer",
    label: "Модул 2: Оферта",
    subtitle: "NeuroMarketing Offer Strategist",
    description: "Създай неустоима оферта използвайки принципите на неврологичния маркетинг. Ценообразуване, пакети и психология на покупката.",
    icon: Gift,
    color: "text-orange-500",
    bg: "bg-orange-500/10 border-orange-500/20",
    systemPrompt: `Ти си NeuroMarketing Offer Strategist — специализиран AI асистент за създаване на неустоими оферти използвайки неврологичен маркетинг. Отговаряш САМО на български език.

ТВОЯТА РОЛЯ:
Помагаш на предприемача да изгради оферта, която говори директно на подсъзнанието на клиента и прави покупката лесна и естествена.

ОБЛАСТИ:
1. CORE OFFER — Каква е основната оферта? Какви трансформации предлага?
2. ЦЕНООБРАЗУВАНЕ — Как да ценообразуваш за максимална стойност и продажби?
3. ПАКЕТИ И НИВА — Как да структурираш различни нива на оферти?
4. ГАРАНЦИИ — Как да елиминираш риска за клиента?
5. БОНУСИ И СТОЙНОСТ — Как да увеличиш възприеманата стойност?
6. ПСИХОЛОГИЯ НА ПОКУПКАТА — Urgency, scarcity, social proof

НЕВРОЛОГИЧНИ ПРИНЦИПИ:
- Reciprocity (реципрочност)
- Scarcity & Urgency (оскъдност и спешност)
- Social Proof (социално доказателство)
- Authority (авторитет)
- Loss aversion (страх от загуба)
- Anchoring (котвиране на цената)

ФОРМАТ: Конкретни примери, готови формули и скриптове.`,
    initialMessage: "Добре дошъл в Модул 2: Оферта! 🎁\n\nАз съм твоят NeuroMarketing Offer Strategist — ще те науча да създаваш оферти, на които клиентите трудно казват 'не'.\n\n🧠 Ще работим върху:\n- Core offer (основна оферта + трансформация)\n- Ценообразуване и пакети\n- Психологически тригери\n- Гаранции и risk reversal\n\nЗапочваме: **Какво продаваш и каква трансформация предлагаш на клиента?** (напр. 'от X към Y за Z дни').",
    prompts: [
      { label: "💎 Core Offer формула", text: "Помогни ми да формулирам core offer с ясна трансформация: от X към Y за Z." },
      { label: "💰 Ценообразуване", text: "Как да определя правилната цена за продукта/услугата си? Покажи ми различни стратегии." },
      { label: "📦 Пакети и нива", text: "Помогни ми да структурирам 3 нива на оферти (basic/standard/premium)." },
      { label: "🛡️ Гаранция и risk reversal", text: "Как да изградя силна гаранция, която елиминира риска за клиента?" },
      { label: "⏰ Urgency & Scarcity", text: "Как да добавя истинска спешност и оскъдност в офертата без да лъжа?" },
      { label: "🎁 Бонуси за стойност", text: "Какви бонуси да добавя за да увелича 10x възприеманата стойност на офертата?" },
    ],
  },
  {
    id: 3,
    key: "copy",
    label: "Модул 3: Копирайтинг",
    subtitle: "Web Copy Strategist",
    description: "Напиши убедителни текстове за уебсайт, landing pages и имейли. Заголовки, bullets, CTA и продаващи истории.",
    icon: FileText,
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/20",
    systemPrompt: `Ти си Web Copy Strategist — специализиран AI асистент за писане на убедителни продаващи текстове. Отговаряш САМО на български език.

ТВОЯТА РОЛЯ:
Помагаш на предприемача да напише текстове, които конвертират посетителите в клиенти — за уебсайт, landing pages, имейли и социални мрежи.

ОБЛАСТИ:
1. ХЕДЛАЙНИ — Заглавия, които спират скрола
2. HERO SECTION — Главното послание на страницата
3. ПРОБЛЕМ + РЕШЕНИЕ — Как да покажеш разбиране на болката
4. СОЦИАЛНО ДОКАЗАТЕЛСТВО — Testimonials, case studies, числа
5. CTA (Call-to-Action) — Бутони и призиви за действие
6. ИМЕЙЛ КОПИ — Sequences, subject lines, newsletters
7. ПРОДАВАЩА ИСТОРИЯ — Storytelling за конверсии

КОПИРАЙТИНГ ФОРМУЛИ:
- AIDA (Attention, Interest, Desire, Action)
- PAS (Problem, Agitate, Solution)
- BAB (Before, After, Bridge)
- 4Ps (Promise, Picture, Proof, Push)

ПРАВИЛА:
- Пиши на езика на клиента, не на "маркетинг"
- Конкретни числа, не абстрактни твърдения
- Фокус върху трансформацията, не продукта
- Кратко, ясно, действено`,
    initialMessage: "Добре дошъл в Модул 3: Копирайтинг! ✍️\n\nАз съм твоят Web Copy Strategist — ще ти помогна да напишеш текстове, които продават.\n\n📝 Ще работим върху:\n- Хедлайни, които спират скрола\n- Hero section за уебсайта\n- Продаващи имейли\n- CTA бутони и призиви\n- Storytelling за конверсии\n\nНека започнем: **За кой канал ти трябват текстове?** (уебсайт, имейл, социални мрежи, реклами?) И разкажи ми накратко какво продаваш.",
    prompts: [
      { label: "📰 Убиваш хедлайн", text: "Помогни ми да напиша 10 варианта на хедлайн за моя продукт/услуга." },
      { label: "🌟 Hero Section", text: "Напиши hero section за моя уебсайт — хедлайн, sub-headline и CTA бутон." },
      { label: "📧 Имейл sequence", text: "Създай 5-имейлова welcome sequence за нови абонати на моя бизнес." },
      { label: "📖 Продаваща история", text: "Помогни ми да напиша продаваща история (before/after/bridge) за моя бизнес." },
      { label: "⭐ Testimonials структура", text: "Как да събирам и структурирам testimonials за максимален ефект?" },
      { label: "🎯 About page", text: "Напиши убедителна 'За нас' страница, която изгражда доверие и продава." },
    ],
  },
  {
    id: 4,
    key: "traffic",
    label: "Модул 4: Трафик",
    subtitle: "AI Traffic & Copy Strategist",
    description: "Привлечи целеви трафик чрез платени реклами и органично съдържание. Meta Ads, Google Ads и content стратегия.",
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    systemPrompt: `Ти си AI Traffic & Copy Strategist — специализиран AI асистент за генериране на трафик и платени реклами. Отговаряш САМО на български език.

ТВОЯТА РОЛЯ:
Помагаш на предприемача да привлече целеви трафик към бизнеса си — чрез платени реклами (Meta, Google) и органично съдържание.

ОБЛАСТИ:
1. META ADS (Facebook/Instagram) — Структура на кампании, аудитории, креативи
2. GOOGLE ADS — Search, Display, Performance Max
3. КОНТЕНТ СТРАТЕГИЯ — Органично съдържание за социални мрежи
4. РЕТАРГЕТИНГ — Как да връщаш топлите аудитории
5. AD COPY — Текстове за реклами
6. АНАЛИЗ И ОПТИМИЗАЦИЯ — Как да четеш числата и да оптимизираш

РЕКЛАМА СТРУКТУРА:
- Awareness (студена аудитория)
- Consideration (топла аудитория)
- Conversion (купувачи/retarget)
- Retention (съществуващи клиенти)

МЕТРИКИ:
- CPM, CPC, CTR, CPA, ROAS
- Как да тълкуваш резултатите
- Кога да увеличаваш бюджет

ПРИНЦИПИ:
- Тествай малко, скалирай победителите
- Образ > Текст в Meta
- Намерение > Интерес в Google`,
    initialMessage: "Добре дошъл в Модул 4: Трафик! ⚡\n\nАз съм твоят AI Traffic & Copy Strategist — ще те науча как да привличаш клиенти онлайн.\n\n🎯 Ще работим върху:\n- Meta Ads (Facebook/Instagram) кампании\n- Google Ads стратегия\n- Органично съдържание\n- Ретаргетинг и конверсии\n- Анализ и оптимизация\n\nНека започнем: **Какъв е твоят месечен бюджет за реклама?** И кои канали вече ползваш (или искаш да ползваш)?",
    prompts: [
      { label: "📱 Meta Ads структура", text: "Помогни ми да структурирам първата си Meta Ads кампания — аудитории, бюджет и цели." },
      { label: "🔍 Google Ads", text: "Как да стартирам Google Search кампания за моя бизнес? Какви keywords да таргетирам?" },
      { label: "🔄 Ретаргетинг план", text: "Изгради ми пълна ретаргетинг стратегия за хора, които са посетили сайта ми." },
      { label: "✍️ Ad Copy реклами", text: "Напиши 5 варианта на рекламен текст за Meta Ads за моя продукт/услуга." },
      { label: "📊 Анализ на резултати", text: "Обясни ми как да тълкувам ключовите метрики: CPM, CPC, CTR, ROAS и кога да оптимизирам." },
      { label: "📅 Content календар", text: "Създай ми 30-дневен content календар за органично съдържание в социалните мрежи." },
    ],
  },
];

export default function ModulesPage() {
  const navigate = useNavigate();
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const { isModuleCompleted, completedCount, totalModules, methodologyCompleted } = useMethodologyProgress();

  const toggleExpanded = (moduleId: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleStartModule = (module: ModuleConfig, promptIndex?: number) => {
    navigate("/assistant", {
      state: {
        module: {
          id: module.id,
          key: module.key,
          label: module.label,
          systemPrompt: module.systemPrompt,
          initialMessage: module.initialMessage,
          prompts: module.prompts,
          startPromptIndex: promptIndex,
        },
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Бизнес методология</h1>
              <p className="text-muted-foreground mt-1">5 модула от идея до скалиращ бизнес</p>
            </div>
            <Badge variant={methodologyCompleted ? "default" : "secondary"} className="text-sm px-3 py-1">
              {completedCount}/{totalModules} завършени
            </Badge>
          </div>
        </div>

        {/* Journey overview */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {MODULES.map((m, i) => (
            <div key={m.key} className="flex items-center gap-2 shrink-0">
              <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium", m.bg, m.color)}>
                <m.icon className="h-3.5 w-3.5" />
                <span>{m.label.split(": ")[1]}</span>
              </div>
              {i < MODULES.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        {/* Module cards */}
        <div className="grid gap-4">
          {MODULES.map((module, i) => {
            const Icon = module.icon;
            const isExpanded = expandedModules.has(module.id);
            const visiblePrompts = isExpanded ? module.prompts : module.prompts.slice(0, 3);
            const hasMore = module.prompts.length > 3;
            const completed = isModuleCompleted(module.key);

            return (
              <motion.div
                key={module.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className={cn("hover:shadow-md transition-shadow", completed && "border-green-500/30 bg-green-500/5")}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn("p-3 rounded-2xl border shrink-0", module.bg)}>
                        <Icon className={cn("h-6 w-6", module.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{module.label}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {module.subtitle}
                              </Badge>
                              {completed && <Badge variant="default" className="text-xs bg-green-600">Завършен</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                          </div>
                        </div>

                        {/* Prompt pills — clickable */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {visiblePrompts.map((p, pi) => (
                            <button
                              key={pi}
                              onClick={() => handleStartModule(module, pi)}
                              className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors cursor-pointer text-left"
                            >
                              {p.label}
                            </button>
                          ))}
                          {hasMore && (
                            <button
                              onClick={() => toggleExpanded(module.id)}
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors flex items-center gap-1"
                              )}
                            >
                              {isExpanded ? (
                                <>Скрий <ChevronDown className="h-3 w-3 rotate-180" /></>
                              ) : (
                                <>+{module.prompts.length - 3} още <ChevronDown className="h-3 w-3" /></>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="mt-4">
                          <Button
                            onClick={() => handleStartModule(module)}
                            className="gap-2"
                            size="sm"
                          >
                            Стартирай модула
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
