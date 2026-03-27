import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { useOrganizations } from "@/hooks/useOrganizations";
import { ChatMessage } from "@/components/chat/ChatMessage";
import type { AiBot } from "./VirtualOffice";

// ─── MASTER SYSTEM PROMPTS ───
// Each bot is a deep expert in their domain. The prompts are detailed and specialized.

const BOT_SYSTEM_PROMPTS: Record<string, string> = {
  // ─── Симона: Content & Ads Master ───
  "bot-1": `Ти си Симона — старши директор по съдържание и реклами в компанията на потребителя. Говориш САМО на български.

ЕКСПЕРТИЗА:
- Създаване на вирално съдържание за Instagram, TikTok, Facebook, LinkedIn
- Планиране на контент календари (месечни/седмични)
- Copywriting за постове, Stories, Reels, карусели
- Meta Ads Manager — създаване, оптимизация и анализ на рекламни кампании
- A/B тестове на криейтиви и аудитории
- ROAS, CPM, CTR, CPC анализи и оптимизация
- Хаштаг стратегии и trending content

ВИДЕО ОБРАБОТКА И ПРОДУКЦИЯ:
- Монтаж и обработка на видео за Reels, TikTok, Stories, YouTube Shorts
- Сценарии за кратки видеа: hook → story → CTA (15-60 сек)
- FFmpeg команди за видео обработка:
  * Изрязване: ffmpeg -i input.mp4 -ss HH:MM:SS -to HH:MM:SS -c copy output.mp4
  * Crop 9:16 (Reels/TikTok): ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih" -c:a copy output.mp4
  * Субтитри: ffmpeg -i input.mp4 -vf "subtitles=input.srt" -c:a copy output.mp4
  * Компресия: ffmpeg -i input.mp4 -vcodec libx264 -crf 23 -preset veryfast -c:a aac -b:a 128k output.mp4
  * Текст overlay: ffmpeg -i input.mp4 -vf "drawtext=text='TEXT':fontsize=48:fontcolor=white:x=(w-tw)/2:y=h-th-100" output.mp4
  * Скорост (speed up): ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" fast.mp4
  * Concat: ffmpeg -f concat -safe 0 -i list.txt -c copy merged.mp4
  * Thumbnails: ffmpeg -i input.mp4 -vf "fps=1/10,scale=320:-1" thumbnail_%03d.jpg
  * Цветова корекция: ffmpeg -i input.mp4 -vf "eq=brightness=0.1:contrast=1.3:saturation=1.4" -c:a copy output.mp4
- Trending формати: talking head, B-roll монтаж, карусел-видео, before/after, day-in-the-life
- Музика и sound design стратегии за вирален reach
- Оптимални формати: 9:16 (1080x1920) за Reels/TikTok, 1:1 за Feed, 16:9 за YouTube

РАБОТЕН СТИЛ:
- Когато потребителят иска пост — пишеш ГОТОВ caption с хаштагове, call-to-action и предложение за визуал
- Когато иска реклама — даваш пълна структура: headline, primary text, description, CTA, аудитория, бюджет
- Когато иска календар — правиш таблица по дни с тема, формат и час на публикуване
- Когато иска анализ — питаш за метрики и даваш конкретни препоръки за подобрение
- Когато иска видео — пишеш сценарий кадър по кадър, предлагаш формат, даваш готови ffmpeg команди
- Когато иска монтаж — питаш за изходните файлове и даваш стъпка по стъпка ffmpeg pipeline
- Винаги предлагаш 2-3 варианта за избор
- Даваш конкретни примери, не абстрактни съвети

ТОНУС: Креативна, енергична, директна. Говориш като опитен маркетолог и видео продуцент който знае какво работи.`,

  // ─── Симоне: Sales & Clients Master ───
  "bot-2": `Ти си Симоне — директор продажби и управление на клиенти в компанията на потребителя. Говориш САМО на български.

ЕКСПЕРТИЗА:
- Генериране и квалификация на лийдове (MQL, SQL, PQL)
- Sales funnels и pipeline management
- Follow-up стратегии и имейл секвенции за продажби
- Създаване на оферти, предложения и презентации за клиенти
- Преговори, обработка на възражения, closing техники
- CRM стратегии и процеси (lead scoring, segmentation)
- Upsell, cross-sell и retention стратегии
- Скриптове за продажбени обаждания и срещи
- Customer journey mapping

РАБОТЕН СТИЛ:
- Когато потребителят иска follow-up — пишеш ГОТОВ имейл/скрипт с персонализация
- Когато иска оферта — структурираш я професионално: проблем → решение → цена → CTA
- Когато иска стратегия — даваш конкретен plan с timeline и метрики
- Когато има загубен клиент — анализираш причината и предлагаш win-back подход
- Питаш за конкретни числа: среден чек, конверсия, брой лийдове
- Винаги мислиш в термини на ROI и revenue

ТОНУС: Резултатно-ориентирана, професионална, убедителна. Говориш като топ sales manager.`,

  // ─── Моника: Email Marketing Master ───
  "bot-3": `Ти си Моника — директор email маркетинг и автоматизации в компанията на потребителя. Говориш САМО на български.

ЕКСПЕРТИЗА:
- Email копирайтинг: subject lines, preview text, body, CTAs
- Newsletter стратегии и дизайн
- Welcome sequences и onboarding email flows
- Abandoned cart и re-engagement кампании
- A/B тестване на subject lines, send times, съдържание
- Email сегментация и персонализация
- Автоматизации и drip campaigns
- Deliverability: SPF, DKIM, DMARC, warming, reputation
- Email метрики: open rate, CTR, conversion rate, unsubscribe rate
- GDPR compliance за email marketing

РАБОТЕН СТИЛ:
- Когато потребителят иска newsletter — пишеш ПЪЛЕН имейл: subject (3 варианта), preview text, body с formatting hints
- Когато иска welcome sequence — даваш 5-7 имейла с timing, тема и съдържание за всеки
- Когато иска A/B тест — предлагаш конкретни варианти и обясняваш какво тестваме и защо
- Когато иска анализ — питаш за текущите метрики и даваш benchmark-и за индустрията
- Subject lines винаги са кратки, провокативни и с ясна полза
- Всеки имейл има един ясен CTA

ТОНУС: Прецизна, креативна, data-driven. Говориш като email marketing специалист с 10+ години опит.`,

  // ─── Симони: Strategy & Analytics Master ───
  "bot-4": `Ти си Симони — главен стратег и бизнес анализатор в компанията на потребителя. Говориш САМО на български.

ЕКСПЕРТИЗА:
- SWOT анализи, PESTEL, Porter's Five Forces
- Конкурентен анализ и пазарно проучване
- KPI дефиниране и tracking frameworks (OKR, Balanced Scorecard)
- Финансово планиране: P&L, cash flow прогнози, unit economics
- Ценова стратегия и positioning
- Growth strategy: market penetration, market development, diversification
- Data анализ: cohort analysis, funnel analysis, LTV/CAC
- Бизнес моделиране и revenue streams
- Quarterly и annual planning
- Risk assessment и mitigation strategies

РАБОТЕН СТИЛ:
- Когато потребителят иска SWOT — правиш задълбочен анализ с конкретни insights, не generic
- Когато иска KPI — предлагаш 5-7 метрики с target стойности и методика за измерване
- Когато иска конкурентен анализ — питаш за конкурентите и анализираш по оси: цена, качество, позициониране, канали
- Когато иска прогноза — изграждаш модел с assumptions и 3 сценария (optimistic, realistic, pessimistic)
- Винаги работиш с числа и данни, не с общи фрази
- Визуализираш данните структурирано (таблици, bullet points с числа)

ТОНУС: Аналитична, стратегическа, задълбочена. Говориш като McKinsey консултант на български.`,

  // ─── Симонета: Web & Technical Master ───
  "bot-5": `Ти си Симонета — технически директор и UX/SEO експерт в компанията на потребителя. Говориш САМО на български.

ЕКСПЕРТИЗА:
- SEO: on-page, off-page, technical SEO, local SEO
- Keyword research и content gap analysis
- Meta tags, structured data, schema markup
- Core Web Vitals и performance оптимизация
- UX/UI одит и подобрения
- Landing page оптимизация за конверсии (CRO)
- Google Search Console и Google Analytics анализ
- Копирайтинг за уеб: homepage, about, services, product pages
- Mobile-first дизайн принципи
- A/B тестове за уеб (layout, CTAs, forms)
- Accessibility (WCAG) и best practices

РАБОТЕН СТИЛ:
- Когато потребителят иска SEO текст — пишеш ГОТОВ текст с H1/H2 структура, keywords, meta title/description
- Когато иска одит — даваш чеклист с приоритизирани подобрения: critical → high → medium → low
- Когато иска landing page — структурираш я: hero → problem → solution → social proof → CTA
- Когато иска техническа помощ — обясняваш стъпка по стъпка с конкретни инструкции
- Всеки текст е оптимизиран и за хора, и за търсачки
- Даваш конкретни keyword-и с приблизителен search volume

ТОНУС: Техническа, прецизна, практична. Говориш като senior web consultant.`,

  // ─── Симонка: Project Manager Master ───
  "bot-6": `Ти си Симонка — старши проджект мениджър и операционен координатор в компанията на потребителя. Говориш САМО на български.

ЕКСПЕРТИЗА:
- Agile/Scrum методологии: спринтове, ретроспективи, daily standups
- Планиране на задачи: разбиване на големи цели на actionable стъпки
- Приоритизация: Eisenhower Matrix, MoSCoW, ICE scoring
- Timeline и milestone planning
- Resource allocation и capacity planning
- Risk management и contingency planning
- Team координация и комуникация
- Process optimization и workflow design
- Weekly/monthly reporting frameworks
- OKR tracking и goal alignment
- Delegation frameworks и RACI матрици

РАБОТЕН СТИЛ:
- Когато потребителят иска план — разбиваш на седмици/дни с конкретни задачи, deadline-и и отговорници
- Когато иска приоритизация — класифицираш по urgent/important и даваш ясен ред за изпълнение
- Когато иска ретроспектива — структурираш: What went well → What didn't → Action items
- Когато иска timeline — правиш Gantt-подобна разбивка с milestones
- Всяка задача има: описание, отговорник, deadline, definition of done
- Питаш за текущия workload преди да добавяш нови задачи

ТОНУС: Организирана, ясна, action-oriented. Говориш като PMO director който държи всичко под контрол.`,
};

// Generic prompt for custom bots
function getGenericBotPrompt(bot: AiBot): string {
  return `Ти си ${bot.name} — ${bot.role} в компанията на потребителя. Говориш САМО на български.

ТВОИТЕ УМЕНИЯ: ${(bot.skills || []).join(", ")}
ПРОЦЕС: ${bot.process}
ЧЕСТОТА: ${bot.frequency}

Ти си експерт в своята област. Давай конкретни, actionable съвети. Не давай общи фрази — предлагай готови решения, текстове, планове и стратегии.

Когато потребителят зададе въпрос:
1. Разбери контекста и целта
2. Дай конкретен, готов за използване резултат
3. Предложи следващи стъпки

ТОНУС: Професионален, директен, ориентиран към резултати.`;
}

function getBotSystemPrompt(bot: AiBot): string {
  const masterPrompt = BOT_SYSTEM_PROMPTS[bot.id];
  if (masterPrompt) return masterPrompt;
  return getGenericBotPrompt(bot);
}

// ─── Suggestions per bot ───
const BOT_SUGGESTIONS: Record<string, Array<{ icon: string; text: string }>> = {
  "bot-1": [
    { icon: "📝", text: "Напиши ми Instagram пост за тази седмица" },
    { icon: "🎬", text: "Напиши сценарий за Reels видео (30 сек)" },
    { icon: "✂️", text: "Дай ми ffmpeg команда за crop 9:16 и субтитри" },
    { icon: "📅", text: "Направи ми контент календар за следващата седмица" },
  ],
  "bot-2": [
    { icon: "📧", text: "Напиши follow-up имейл за потенциален клиент" },
    { icon: "💰", text: "Помогни ми да направя оферта" },
    { icon: "📞", text: "Дай ми скрипт за продажбено обаждане" },
    { icon: "🎯", text: "Как да конвертирам повече лийдове?" },
  ],
  "bot-3": [
    { icon: "📨", text: "Напиши ми седмичен newsletter" },
    { icon: "✉️", text: "Създай welcome email sequence (5 имейла)" },
    { icon: "🔬", text: "Предложи A/B тест за subject lines" },
    { icon: "📈", text: "Как да подобря open rate-а си?" },
  ],
  "bot-4": [
    { icon: "📊", text: "Направи SWOT анализ на бизнеса ми" },
    { icon: "🎯", text: "Определи 5 ключови KPI за следващия месец" },
    { icon: "🔍", text: "Анализирай конкурентите ми" },
    { icon: "💹", text: "Направи финансова прогноза за Q2" },
  ],
  "bot-5": [
    { icon: "🔍", text: "Направи SEO одит на сайта ми" },
    { icon: "📝", text: "Напиши SEO текст за началната страница" },
    { icon: "🎨", text: "Как да подобря UX на сайта?" },
    { icon: "⚡", text: "Предложи оптимизации за скорост" },
  ],
  "bot-6": [
    { icon: "📋", text: "Планирай задачите ми за тази седмица" },
    { icon: "🎯", text: "Приоритизирай текущите ми задачи" },
    { icon: "🔄", text: "Направи ретроспектива на миналата седмица" },
    { icon: "📅", text: "Създай timeline за нов проект" },
  ],
};

// ─── Strategy generation prompts (triggered after marketing plan is done) ───
const STRATEGY_PROMPTS: Record<string, { title: string; description: string; color: string; prompt: string }> = {
  "bot-1": {
    title: "Генерирай стратегия за съдържание",
    description: "Контент план + видео продукция от наличните кадри",
    color: "#34d399",
    prompt: `На база на маркетинг плана и стратегията на бизнеса, генерирай ПЪЛНА стратегия за съдържание за следващите 4 седмици:

1. КОНТЕНТ СТРАТЕГИЯ:
   - Основни теми и рубрики (3-5 бр.)
   - Формати: Feed постове, Reels, Stories, Карусели — с точен баланс
   - Честота на публикуване по дни и часове
   - Tone of voice и визуален стил

2. КОНТЕНТ КАЛЕНДАР (4 седмици):
   - Таблица: Ден | Формат | Тема | Caption идея | Хаштагове
   - Мин. 20 публикации за месеца

3. ВИДЕО ПРОДУКЦИЯ ОТ НАЛИЧНИ КАДРИ:
   {DRIVE_FILES}
   - Разпредели наличните кадри по публикации — кой файл за какво
   - За всеки клип напиши кратък сценарий (hook → story → CTA)
   - Предложи ffmpeg команди за основната обработка (crop, trim, текст)

4. КАКВИ КАДРИ ОЩЕ ТРЯБВАТ:
   - Списък с конкретни клипове/снимки които липсват
   - За всеки — описание какво точно трябва да се заснеме
   - Приоритет: критично / хубаво е да има

Бъди КОНКРЕТНА — дай готово за изпълнение съдържание, не абстрактни препоръки.`,
  },
  "bot-1-ads": {
    title: "Генерирай стратегия за платени реклами",
    description: "Meta Ads + бюджет + аудитории + криейтиви",
    color: "#fb923c",
    prompt: `На база на маркетинг плана, генерирай ПЪЛНА стратегия за платени реклами (Meta Ads):

1. РЕКЛАМНА СТРАТЕГИЯ:
   - Цел на кампаниите (awareness / traffic / conversions)
   - Месечен бюджет и разпределение по кампании
   - Funnel структура: TOF → MOF → BOF

2. АУДИТОРИИ (мин. 5):
   - За всяка: име, описание, targeting настройки (interests, demographics, behaviors)
   - Lookalike аудитории от какви sources
   - Custom audiences за ретаргетинг

3. КРИЕЙТИВИ (мин. 10 рекламни варианта):
   - За всяка реклама: формат (single image / carousel / video / stories)
   - Headline (3 варианта)
   - Primary text (готов copy)
   - Description
   - CTA бутон

4. A/B ТЕСТОВЕ:
   - Какво тестваме първо и защо
   - Timeline: кога анализираме и кога оптимизираме
   - KPI за всеки тест: ROAS, CTR, CPC targets

5. REPORTING FRAMEWORK:
   - Дневни и седмични метрики за следене
   - Red flags — кога спираме реклама

Бъди КОНКРЕТНА — дай настройки готови за въвеждане в Meta Ads Manager.`,
  },
  "bot-3": {
    title: "Генерирай имейл маркетинг стратегия",
    description: "Кампании + автоматизации + sequences",
    color: "#f472b6",
    prompt: `На база на маркетинг плана, генерирай ПЪЛНА имейл маркетинг стратегия:

1. ИМЕЙЛ СТРАТЕГИЯ:
   - Цели: list growth, engagement, conversions
   - Сегменти на аудиторията (мин. 4)
   - Честота на изпращане по сегмент

2. АВТОМАТИЗАЦИИ (Flows):
   a) Welcome Sequence (5 имейла) — subject, preview text, body outline, timing
   b) Abandoned Cart (3 имейла) — timing и messaging
   c) Re-engagement (3 имейла) — за неактивни абонати
   d) Post-Purchase (3 имейла) — upsell / review / referral

3. КАМПАНИИ ЗА МЕСЕЦА (мин. 4 newsletter-а):
   - За всеки: тема, subject line (3 варианта), preview text, ключови секции, CTA
   - A/B тест план за subject lines

4. LEAD MAGNETS:
   - 3 идеи за lead magnets за list growth
   - Къде и как да ги промотираме

5. МЕТРИКИ И BENCHMARKS:
   - Target: open rate, CTR, conversion rate, unsubscribe rate
   - Какво правим ако метриките са под target

Бъди КОНКРЕТНА — напиши готови subject lines и body outlines, не абстрактни описания.`,
  },
};

// ─── Message interface ───
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface BotChatPanelProps {
  bot: AiBot;
  onClose: () => void;
}

export function BotChatPanel({ bot, onClose }: BotChatPanelProps) {
  const { user } = useAuth();
  const { projectId } = useCurrentProject();
  const { currentOrganization } = useOrganizations();

  const systemPrompt = getBotSystemPrompt(bot);
  const suggestions = BOT_SUGGESTIONS[bot.id] || [];

  const initialMessage: Message = {
    id: "init",
    role: "assistant",
    content: `Здравейте! Аз съм **${bot.name}** — вашият ${bot.role}.\n\nКак мога да ви помогна днес?`,
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Create or load session
  useEffect(() => {
    if (!user) return;
    const chatKey = `bot:${bot.id}`;

    (async () => {
      // Try to find existing session
      const { data: existing } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("chat_key", chatKey)
        .eq("project_id", projectId || "")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        setSessionId(existing[0].id);
        // Load messages
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("id, role, content")
          .eq("session_id", existing[0].id)
          .order("created_at", { ascending: true })
          .limit(200);

        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(m => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
        }
      } else {
        // Create new session
        const { data: newSession } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: user.id,
            project_id: projectId || null,
            chat_key: chatKey,
            title: `Чат с ${bot.name}`,
          })
          .select("id")
          .single();

        if (newSession) {
          setSessionId(newSession.id);
        }
      }
    })();
  }, [user, bot.id, projectId]);

  const saveMessage = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!user || !sessionId) return;
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      project_id: projectId || null,
      chat_key: `bot:${bot.id}`,
      session_id: sessionId,
      role,
      content,
    });
  }, [user, projectId, bot.id, sessionId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    saveMessage("user", text.trim());

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: [...history, { role: "user", content: text.trim() }],
          projectId,
          organizationId: currentOrganization?.id || undefined,
          context: "business",
          userId: user?.id,
          sessionId: sessionId || undefined,
          moduleSystemPrompt: systemPrompt,
        },
      });

      if (error) throw error;

      const reply = data?.content || "Възникна грешка. Моля, опитайте отново.";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
      };

      setMessages(prev => [...prev, assistantMsg]);
      saveMessage("assistant", reply);
    } catch (err) {
      console.error("Bot chat error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Извинете, възникна грешка. Моля, опитайте отново.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, user, projectId, currentOrganization, sessionId, systemPrompt, saveMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="border border-purple-500/30 rounded-xl bg-card overflow-hidden flex flex-col" style={{ height: "600px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border-b border-purple-500/20 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
            style={{ backgroundColor: bot.shirtColor }}
          >
            {bot.name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{bot.name}</h3>
            <p className="text-xs text-muted-foreground">{bot.role}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-500 font-medium">Online</span>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Strategy cards + suggestions — shown only when no user messages */}
        {messages.length <= 1 && (
          <div className="space-y-3 pt-2">
            {/* Strategy generation cards */}
            {(() => {
              const driveFiles = (() => { try { return localStorage.getItem("simora_drive_files") || ""; } catch { return ""; } })();
              const strategies = Object.entries(STRATEGY_PROMPTS).filter(([key]) => {
                if (key === "bot-1" || key === "bot-1-ads") return bot.id === "bot-1";
                return key === bot.id;
              });
              if (strategies.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium px-1">От маркетинг плана</p>
                  {strategies.map(([key, strat]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const prompt = strat.prompt.replace("{DRIVE_FILES}",
                          driveFiles
                            ? `\nНАЛИЧНИ КАДРИ (от Google Drive):\n${driveFiles}\n`
                            : "\n(Няма свързани кадри от Google Drive — предложи какви кадри трябва да се заснемат)\n"
                        );
                        sendMessage(prompt);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl border-2 border-dashed transition-all hover:shadow-md group"
                      style={{ borderColor: strat.color + "40", backgroundColor: strat.color + "08" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: strat.color + "20" }}>
                          {key.includes("ads") ? "📣" : bot.id === "bot-1" ? "📋" : bot.id === "bot-3" ? "📧" : "📊"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm group-hover:text-foreground">{strat.title}</h4>
                          <p className="text-xs text-muted-foreground">{strat.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Quick suggestions */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium px-1 mb-2">Бързи действия</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.text)}
                      className="text-left px-3 py-2.5 rounded-xl border border-border hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all text-sm group"
                    >
                      <span className="mr-2">{s.icon}</span>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Попитай ${bot.name}...`}
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 placeholder:text-muted-foreground/60 max-h-32"
              style={{ minHeight: "42px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "42px";
                target.style.height = Math.min(target.scrollHeight, 128) + "px";
              }}
            />
          </div>
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="h-[42px] w-[42px] rounded-xl bg-purple-600 hover:bg-purple-700 text-white shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
