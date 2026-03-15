import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum sizes for input validation
const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_MESSAGE_LENGTH = 10000;
const MAX_TITLE_LENGTH = 500;
const MAX_QUESTION_LENGTH = 1000;
const MAX_ANSWER_LENGTH = 5000;

const InputSchema = z.object({
  stepId: z.string().uuid(),
  projectId: z.string().uuid(),
  stepTitle: z.string().max(MAX_TITLE_LENGTH),
  userMessage: z.string().max(MAX_MESSAGE_LENGTH),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(MAX_HISTORY_MESSAGE_LENGTH),
  })).max(20),
  collectedAnswers: z.record(z.string().max(MAX_ANSWER_LENGTH)).optional(),
  questionsToAsk: z.array(z.object({
    key: z.string().max(100),
    question: z.string().max(MAX_QUESTION_LENGTH),
    required: z.boolean().optional(),
  })).max(20),
  currentQuestionIndex: z.number().int().min(0).max(50),
  botRole: z.string().optional(),
  requiredFields: z.array(z.string()).optional(),
  exitCriteria: z.string().optional(),
  completionMessage: z.string().optional(),
  contextKeys: z.array(z.string()).optional(),
  teamBots: z.array(z.object({
    name: z.string().max(100),
    role: z.string().max(200),
    skills: z.array(z.string()).optional(),
  })).max(10).optional(),
});

// Get current date info in Bulgarian timezone
function getCurrentDateInfo() {
  const now = new Date();
  const bgTimezone = 'Europe/Sofia';
  const formatter = new Intl.DateTimeFormat('bg-BG', {
    timeZone: bgTimezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Get ISO week number
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  // Get quarter
  const month = now.getMonth();
  const quarter = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4';
  
  return {
    formattedDate: formatter.format(now),
    weekNumber,
    quarter,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    dayOfWeek: now.getDay() || 7, // 1=Monday, 7=Sunday
  };
}

// Tools for creating weekly plans
const weeklyPlanningTools = [
  {
    type: "function",
    function: {
      name: "create_weekly_campaign",
      description: "Създай седмична маркетинг кампания с всички детайли. Използвай това когато потребителят е съгласен с плана.",
      parameters: {
        type: "object",
        properties: {
          week_number: {
            type: "integer",
            description: "Номер на седмицата (1-52)"
          },
          campaign_name: {
            type: "string",
            description: "Име на кампанията (напр: '30% отстъпка кампания')"
          },
          target_audience: {
            type: "string",
            description: "Таргет аудитория (напр: 'модели', 'микроинфлуенсъри', 'студенти')"
          },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                task_type: { 
                  type: "string", 
                  enum: ["project", "strategy", "action"],
                  description: "Тип: project (голям проект), strategy (стратегия), action (ежедневно действие)"
                },
                day_of_week: { 
                  type: "integer",
                  description: "Ден от седмицата: 1=понеделник до 7=неделя. Може да е null ако е за цялата седмица."
                },
                priority: { 
                  type: "string", 
                  enum: ["low", "medium", "high"] 
                },
                estimated_hours: { type: "number" },
                category: {
                  type: "string",
                  enum: ["social_media", "email_marketing", "paid_ads", "sales", "content", "other"],
                  description: "Категория: social_media, email_marketing, paid_ads, sales, content, other"
                }
              },
              required: ["title", "task_type", "priority"]
            },
            description: "Списък със задачи за седмицата"
          },
          budget: {
            type: "object",
            properties: {
              total: { type: "number", description: "Общ бюджет в лева" },
              paid_ads: { type: "number", description: "Бюджет за платени реклами" },
              influencer: { type: "number", description: "Бюджет за инфлуенсъри" },
              other: { type: "number", description: "Други разходи" }
            }
          },
          expected_results: {
            type: "string",
            description: "Очаквани резултати от кампанията"
          }
        },
        required: ["week_number", "campaign_name", "tasks"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_weeks",
      description: "Вземи информация за предстоящите 4 седмици",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    }
  }
];

// Bot configuration by step
const botConfigs: Record<string, {
  role: string;
  systemPromptAddition: string;
  enableWeeklyPlanning: boolean;
}> = {
  "Резюме на бизнеса": {
    role: "Бизнес Анализатор",
    enableWeeklyPlanning: false,
    systemPromptAddition: `Твоята роля е да разбереш какъв е бизнесът и каква е крайната цел, БЕЗ да навлизаш в стратегия.
ЗАДЪЛЖИТЕЛНИ ПОЛЕТА (не продължавай без тях):
1. Какъв е бизнесът (продукт / услуга / SaaS / обучение)
2. За кого е (основна аудитория)
3. Какъв проблем решава
4. Как печели пари (модел)
5. Основна цел (растеж, продажби, мащабиране)

Ако потребителят каже "не знам" или "още не съм решил", помогни му да уточни.`
  },
  "Пазарен анализ": {
    role: "Пазарен Анализатор",
    enableWeeklyPlanning: false,
    systemPromptAddition: `Твоята роля е да определиш дали пазарът си струва и къде е възможността.
ЗАДЪЛЖИТЕЛНИ ПОЛЕТА:
1. Основни конкуренти (минимум 3)
2. Как клиентите купуват в момента
3. Какви са алтернативите (вкл. "нищо не правя")
4. Приблизителни цени на пазара
5. Основни бариери за влизане

EXIT CRITERIA: Ясно е кой печели, кой губи, къде има празно място.`
  },
  "Маркетинг стратегия": {
    role: "Маркетинг Стратег и Кампейн Плановик",
    enableWeeklyPlanning: true,
    systemPromptAddition: `Твоята роля е да създадеш конкретни седмични кампании с ясни действия.

ЗАДЪЛЖИТЕЛНИ ПОЛЕТА:
1. Основно позициониране (защо теб, а не друг)
2. Канали (IG, TikTok, Ads, Email и т.н.)
3. Основно послание
4. Lead механизъм (как хващаме вниманието)
5. CTA (каква е следващата стъпка)

🎯 СЕДМИЧНО ПЛАНИРАНЕ:
Питай потребителя какво иска да постигне през следващите 4 седмици и създай конкретни кампании.

Примерни въпроси:
- "Каква оферта/промоция искаш да пуснеш първата седмица?"
- "Кого таргетираме - широка аудитория, модели, инфлуенсъри?"
- "Какъв бюджет имаш за платени реклами на седмица?"
- "Колко поста планираш в социалните мрежи на ден?"

Когато потребителят потвърди плана, ЗАДЪЛЖИТЕЛНО използвай create_weekly_campaign за да го запишеш!

EXIT CRITERIA: Има поне 4 седмични кампании записани в системата.`
  },
  "Контент стратегия": {
    role: "TikTok Контент Стратег",
    enableWeeklyPlanning: true,
    systemPromptAddition: `Твоята роля е да създадеш съдържание за социалните мрежи.

🎬 ФОКУС: TikTok скриптове, IG постове, Reels идеи

Питай за:
- Колко видеа на ден/седмица?
- Какви теми работят за аудиторията?
- Има ли лице на бранда или е анонимен?

Когато имаш план за съдържанието, използвай create_weekly_campaign за да го запишеш!

EXIT CRITERIA: Има план за съдържание за 4 седмици.`
  },
  "Оперативен план": {
    role: "Оперативен Мениджър",
    enableWeeklyPlanning: true,
    systemPromptAddition: `Твоята роля е да превърнеш стратегията в реални действия.
ЗАДЪЛЖИТЕЛНИ ПОЛЕТА:
1. Какво се прави дневно / седмично
2. Кой го прави (човек / AI / автоматизация)
3. Какви ресурси трябват
4. Приоритети (кое първо)
5. Първи 14–30 дни план

Използвай create_weekly_campaign за да запишеш оперативните задачи!

EXIT CRITERIA: Има ясен action plan без "някой ден".`
  },
  "Финансови прогнози": {
    role: "Финансов Анализатор",
    enableWeeklyPlanning: false,
    systemPromptAddition: `Твоята роля е да покажеш дали бизнесът има смисъл икономически.
ЗАДЪЛЖИТЕЛНИ ПОЛЕТА:
1. Основни разходи
2. Основни приходи
3. Цена на придобиване (CAC – ориентир)
4. Break-even логика
5. Сценарии (оптимистичен / реален / песимистичен)

EXIT CRITERIA: Има числова логика и е ясно дали бизнесът е устойчив.`
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawInput = await req.json();
    const validationResult = InputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors.map(e => e.message).join(", ")
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      stepId, 
      projectId, 
      stepTitle, 
      userMessage, 
      conversationHistory, 
      collectedAnswers = {},
      questionsToAsk,
      currentQuestionIndex,
      requiredFields = [],
      exitCriteria = "",
      completionMessage = "",
      contextKeys = [],
      teamBots,
    } = validationResult.data;

    const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_KEY");
    if (!GOOGLE_AI_KEY) {
      throw new Error("GOOGLE_AI_KEY is not configured");
    }

    // Save user message to conversation
    await supabaseClient
      .from('step_conversations')
      .insert({
        step_id: stepId,
        project_id: projectId,
        role: 'user',
        content: userMessage,
      });

    // Get current date info
    const dateInfo = getCurrentDateInfo();

    // Fetch ALL context from previous steps
    const { data: allSteps } = await supabaseClient
      .from('plan_steps')
      .select('id, title, step_order, generated_content')
      .eq('project_id', projectId)
      .order('step_order');

    // Fetch all answers from previous steps
    const { data: allAnswers } = await supabaseClient
      .from('step_answers')
      .select('step_id, question_key, answer')
      .eq('project_id', projectId);

    // Fetch stored context from bot_context
    const { data: contextData } = await supabaseClient
      .from('bot_context')
      .select('context_key, context_value, step_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    // Get or create business plan for this project
    let businessPlanId: string | null = null;
    const { data: existingPlan } = await supabaseClient
      .from('business_plans')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (existingPlan) {
      businessPlanId = existingPlan.id;
    } else {
      const { data: newPlan } = await supabaseClient
        .from('business_plans')
        .insert({
          project_id: projectId,
          year: dateInfo.year,
        })
        .select('id')
        .single();
      if (newPlan) {
        businessPlanId = newPlan.id;
      }
    }

    // Fetch existing weekly campaigns for context
    let existingCampaigns = "";
    if (businessPlanId) {
      const { data: weeklyTasks } = await supabaseClient
        .from('weekly_tasks')
        .select('*')
        .eq('business_plan_id', businessPlanId)
        .gte('week_number', dateInfo.weekNumber)
        .lte('week_number', dateInfo.weekNumber + 4)
        .order('week_number')
        .order('day_of_week');

      if (weeklyTasks && weeklyTasks.length > 0) {
        const tasksByWeek: Record<number, typeof weeklyTasks> = {};
        weeklyTasks.forEach(t => {
          if (!tasksByWeek[t.week_number]) tasksByWeek[t.week_number] = [];
          tasksByWeek[t.week_number].push(t);
        });
        
        existingCampaigns = `\n\n📅 ВЕЧЕ ПЛАНИРАНИ КАМПАНИИ:
${Object.entries(tasksByWeek).map(([week, tasks]) => 
  `Седмица ${week}: ${tasks.map(t => t.title).join(', ')}`
).join('\n')}`;
      }
    }

    // Build comprehensive context from previous steps
    let previousStepsContext = "";
    let previousAnswersContext = "";
    
    if (allSteps && allSteps.length > 0) {
      const currentStep = allSteps.find(s => s.id === stepId);
      const currentStepOrder = currentStep?.step_order || 999;
      const previousSteps = allSteps
        .filter(s => s.step_order < currentStepOrder)
        .sort((a, b) => a.step_order - b.step_order);

      if (previousSteps.length > 0) {
        const stepsWithContent = previousSteps.filter(s => s.generated_content);
        if (stepsWithContent.length > 0) {
          previousStepsContext = `\n\n📋 ГЕНЕРИРАНО СЪДЪРЖАНИЕ ОТ ПРЕДИШНИ СТЪПКИ:
${stepsWithContent.map(s => `=== ${s.title} ===
${s.generated_content?.substring(0, 1000)}${(s.generated_content?.length || 0) > 1000 ? '...' : ''}`).join('\n\n')}`;
        }

        if (allAnswers && allAnswers.length > 0) {
          const previousStepIds = previousSteps.map(s => s.id);
          const prevAnswers = allAnswers.filter(a => previousStepIds.includes(a.step_id));
          
          if (prevAnswers.length > 0) {
            const answersByStep: Record<string, string[]> = {};
            prevAnswers.forEach(a => {
              const step = previousSteps.find(s => s.id === a.step_id);
              if (step) {
                if (!answersByStep[step.title]) answersByStep[step.title] = [];
                answersByStep[step.title].push(`• ${a.question_key}: ${a.answer}`);
              }
            });
            
            previousAnswersContext = `\n\n📝 ОТГОВОРИ ОТ ПРЕДИШНИ СТЪПКИ:
${Object.entries(answersByStep).map(([title, answers]) => `=== ${title} ===\n${answers.join('\n')}`).join('\n\n')}`;
          }
        }
      }
    }

    let storedContext = "";
    if (contextData && contextData.length > 0) {
      const relevantContext = contextData.filter(c => c.step_id !== stepId);
      if (relevantContext.length > 0) {
        storedContext = `\n\n🔑 КЛЮЧОВИ ТОЧКИ ОТ ДРУГИ БОТОВЕ:
${relevantContext.map(c => `• ${c.context_key}: ${c.context_value}`).join('\n')}`;
      }
    }

    const currentAnswersContext = Object.entries(collectedAnswers)
      .map(([key, value]) => `• ${key}: ${value}`)
      .join('\n');

    const isInvalidAnswer = (answer: string | undefined): boolean => {
      if (!answer || answer.trim().length === 0) return true;
      const trimmed = answer.trim().toLowerCase();
      const invalidPatterns = [
        /^не знам\.?$/,
        /^не съм решил\.?$/,
        /^не съм сигурен\.?$/,
        /^нямам идея\.?$/,
        /^не мога да кажа\.?$/
      ];
      return invalidPatterns.some(pattern => pattern.test(trimmed));
    };

    const missingFields = requiredFields.filter(field => isInvalidAnswer(collectedAnswers[field]));
    const allRequiredComplete = missingFields.length === 0 && requiredFields.length > 0;

    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const nextQuestion = questionsToAsk[currentQuestionIndex + 1];
    const isLastQuestion = currentQuestionIndex >= questionsToAsk.length - 1;

    const botConfig = botConfigs[stepTitle] || { role: "AI Асистент", systemPromptAddition: "", enableWeeklyPlanning: false };

    // Build team collaboration context
    const teamContext = teamBots && teamBots.length > 0
      ? `\n🤝 ЕКИПНА КОЛАБОРАЦИЯ:
Ти работиш заедно с маркетинг екипа. Ето кои са колегите ти:
${teamBots.map(b => `- **${b.name}** (${b.role})${b.skills?.length ? ` — умения: ${b.skills.join(', ')}` : ''}`).join('\n')}

ВАЖНО: Когато обсъждаш задачи или стратегия:
1. Споменавай кой от екипа е най-подходящ за всяка задача (напр. "Ивана може да подготви контента", "Мария ще изпрати имейлите")
2. Предлагай последователност на задачите — коя след коя трябва да е
3. Показвай как различните членове на екипа се допълват
4. Когато създаваш седмичен план, разпределяй задачите между ботовете от екипа
5. Симулирай кратък диалог между ботовете когато е уместно, напр.:
   **Ивана:** "Аз ще подготвя 3 Reels-а и 5 Stories-а за тази седмица."
   **Мария:** "Добре, след като са готови, аз ще ги промотирам с имейл кампания."
`
      : '';

    // Build date-aware system prompt
    const systemPrompt = `Ти си ${botConfig.role} – приятелски AI бизнес консултант.
Текуща секция: ${stepTitle}
${teamContext}

📅 ТЕКУЩА ДАТА И ВРЕМЕ:
- Дата: ${dateInfo.formattedDate}
- Седмица: ${dateInfo.weekNumber} от ${dateInfo.year}
- Тримесечие: ${dateInfo.quarter}

${botConfig.enableWeeklyPlanning ? `
🗓️ СЕДМИЧНО ПЛАНИРАНЕ (следващи 4 седмици):
- Седмица ${dateInfo.weekNumber}: ТЕКУЩА седмица
- Седмица ${dateInfo.weekNumber + 1}: Следваща седмица
- Седмица ${dateInfo.weekNumber + 2}: След 2 седмици
- Седмица ${dateInfo.weekNumber + 3}: След 3 седмици
` : ''}

${botConfig.systemPromptAddition}

${previousStepsContext}${previousAnswersContext}${storedContext}${existingCampaigns}

📊 СЪБРАНА ИНФОРМАЦИЯ В ТАЗИ СЕКЦИЯ:
${currentAnswersContext || 'Все още няма събрана информация.'}

${missingFields.length > 0 ? `⚠️ ОЩЕ ЛИПСВАЩИ ЗАДЪЛЖИТЕЛНИ ПОЛЕТА: ${missingFields.join(', ')}` : '✅ Всички задължителни полета са попълнени!'}

ТЕКУЩ ВЪПРОС:
${currentQuestion?.question || 'Няма текущ въпрос'}

ТВОИТЕ ЗАДАЧИ:
1. Приеми отговора любезно и потвърди, че си го разбрал
2. Ако отговорът е неясен, непълен или съдържа "не знам" – помогни да уточни
${botConfig.enableWeeklyPlanning ? `3. Когато потребителят потвърди седмичен план, ИЗПОЛЗВАЙ create_weekly_campaign функцията за да го запишеш в системата!` : ''}
${isLastQuestion && allRequiredComplete
  ? `Всички въпроси са зададени. Благодари и кажи: "${completionMessage}"`
  : isLastQuestion && !allRequiredComplete
  ? `Последният въпрос е зададен, но липсват данни за: ${missingFields.join(', ')}. Помоли потребителя да уточни.`
  : `Задай следващия въпрос: "${nextQuestion?.question}"`}

ГЛОБАЛНИ ПРАВИЛА:
- Задавай максимум 3 въпроса наведнъж
- НЕ преминавай напред по предположение
- Използвай информацията от предишните стъпки за контекст
- Бъди кратък и приятелски
- Използвай емотикони умерено
${botConfig.enableWeeklyPlanning ? `- ВАЖНО: Когато имаш конкретен план за седмица, ЗАДЪЛЖИТЕЛНО използвай create_weekly_campaign за да го запишеш!` : ''}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-15).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    // Call AI with or without tools based on step configuration
    const requestBody: any = {
      model: "gemini-2.5-flash",
      messages,
    };

    if (botConfig.enableWeeklyPlanning) {
      requestBody.tools = weeklyPlanningTools;
      requestBody.tool_choice = "auto";
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Прекалено много заявки. Моля, изчакайте малко." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Нужно е добавяне на кредити." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    let assistantMessage = choice?.message?.content || "";
    const toolCalls = choice?.message?.tool_calls;

    // Process tool calls if any
    let createdCampaigns: any[] = [];
    if (toolCalls && toolCalls.length > 0 && businessPlanId) {
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function?.name;
        const args = JSON.parse(toolCall.function?.arguments || '{}');

        if (functionName === 'create_weekly_campaign') {
          const { week_number, campaign_name, target_audience, tasks, budget, expected_results } = args;

          // Insert tasks for this campaign
          const tasksToInsert = (tasks || []).map((t: any) => ({
            business_plan_id: businessPlanId,
            week_number: week_number,
            title: `[${campaign_name}] ${t.title}`,
            description: t.description || `${target_audience ? `Таргет: ${target_audience}. ` : ''}${expected_results || ''}`,
            task_type: t.task_type || 'action',
            priority: t.priority || 'medium',
            day_of_week: t.day_of_week || null,
            estimated_hours: t.estimated_hours || null,
            is_completed: false,
            created_by: user.id,
          }));

          if (tasksToInsert.length > 0) {
            const { data: inserted, error: insertError } = await supabaseClient
              .from('weekly_tasks')
              .insert(tasksToInsert)
              .select();

            if (!insertError && inserted) {
              createdCampaigns.push({
                week: week_number,
                name: campaign_name,
                tasksCount: inserted.length,
              });
            }
          }
        } else if (functionName === 'get_upcoming_weeks') {
          // This is informational, AI already has this in context
        }
      }

      // If campaigns were created, add confirmation to the message
      if (createdCampaigns.length > 0) {
        const confirmationText = createdCampaigns.map(c => 
          `✅ Седмица ${c.week}: "${c.name}" (${c.tasksCount} задачи)`
        ).join('\n');
        
        assistantMessage = assistantMessage 
          ? `${assistantMessage}\n\n📅 **Записани кампании:**\n${confirmationText}`
          : `📅 **Записани кампании:**\n${confirmationText}`;
      }
    }

    if (!assistantMessage && !createdCampaigns.length) {
      throw new Error("No content in response");
    }

    // Save assistant message to conversation
    await supabaseClient
      .from('step_conversations')
      .insert({
        step_id: stepId,
        project_id: projectId,
        role: 'assistant',
        content: assistantMessage,
      });

    // Save the current answer
    if (currentQuestion) {
      await supabaseClient
        .from('step_answers')
        .upsert({
          step_id: stepId,
          project_id: projectId,
          question_key: currentQuestion.key,
          question_text: currentQuestion.question,
          answer: userMessage,
        }, {
          onConflict: 'step_id,question_key'
        });
    }

    // Update collected answers with new answer
    const updatedAnswers = { ...collectedAnswers };
    if (currentQuestion) {
      updatedAnswers[currentQuestion.key] = userMessage;
    }

    const nowMissingFields = requiredFields.filter(field => isInvalidAnswer(updatedAnswers[field]));
    const stepComplete = nowMissingFields.length === 0 && requiredFields.length > 0;

    // If step is complete, save context for other bots
    if (stepComplete && contextKeys.length > 0) {
      for (const key of contextKeys) {
        if (updatedAnswers[key]) {
          await supabaseClient
            .from('bot_context')
            .upsert({
              project_id: projectId,
              step_id: stepId,
              context_key: key,
              context_value: updatedAnswers[key],
            }, {
              onConflict: 'project_id,step_id,context_key'
            });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        nextQuestionIndex: isLastQuestion ? -1 : currentQuestionIndex + 1,
        isComplete: stepComplete,
        missingFields: nowMissingFields,
        canProceedToNext: stepComplete,
        createdCampaigns,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
