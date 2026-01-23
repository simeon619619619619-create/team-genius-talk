import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum sizes for input validation
const MAX_MESSAGE_LENGTH = 5000;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 2000;

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
});

// Bot configuration by step
const botConfigs: Record<string, {
  role: string;
  systemPromptAddition: string;
}> = {
  "Резюме на бизнеса": {
    role: "Бизнес Анализатор",
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
    role: "Маркетинг Стратег",
    systemPromptAddition: `Твоята роля е да отговориш: как ще влизаме на пазара и с какво послание.
ЗАДЪЛЖИТЕЛНИ ПОЛЕТА:
1. Основно позициониране (защо теб, а не друг)
2. Канали (IG, TikTok, Ads, Email и т.н.)
3. Основно послание
4. Lead механизъм (как хващаме вниманието)
5. CTA (каква е следващата стъпка)

EXIT CRITERIA: Има 1 ясно позициониране и поне 3 маркетинг канала с роля.`
  },
  "Оперативен план": {
    role: "Оперативен Мениджър",
    systemPromptAddition: `Твоята роля е да превърнеш стратегията в реални действия.
ЗАДЪЛЖИТЕЛНИ ПОЛЕТА:
1. Какво се прави дневно / седмично
2. Кой го прави (човек / AI / автоматизация)
3. Какви ресурси трябват
4. Приоритети (кое първо)
5. Първи 14–30 дни план

EXIT CRITERIA: Има ясен action plan без "някой ден".`
  },
  "Финансови прогнози": {
    role: "Финансов Анализатор",
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
      contextKeys = []
    } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
        // Build context from generated content
        const stepsWithContent = previousSteps.filter(s => s.generated_content);
        if (stepsWithContent.length > 0) {
          previousStepsContext = `\n\n📋 ГЕНЕРИРАНО СЪДЪРЖАНИЕ ОТ ПРЕДИШНИ СТЪПКИ:
${stepsWithContent.map(s => `=== ${s.title} ===
${s.generated_content?.substring(0, 1000)}${(s.generated_content?.length || 0) > 1000 ? '...' : ''}`).join('\n\n')}`;
        }

        // Build context from answers
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

    // Build stored context from other bots
    let storedContext = "";
    if (contextData && contextData.length > 0) {
      const relevantContext = contextData.filter(c => c.step_id !== stepId);
      if (relevantContext.length > 0) {
        storedContext = `\n\n🔑 КЛЮЧОВИ ТОЧКИ ОТ ДРУГИ БОТОВЕ:
${relevantContext.map(c => `• ${c.context_key}: ${c.context_value}`).join('\n')}`;
      }
    }

    // Build context from currently collected answers
    const currentAnswersContext = Object.entries(collectedAnswers)
      .map(([key, value]) => `• ${key}: ${value}`)
      .join('\n');

    // Check required fields completion
    const missingFields = requiredFields.filter(field => {
      const answer = collectedAnswers[field];
      return !answer || 
             answer.trim().length === 0 || 
             answer.toLowerCase().includes('не знам') ||
             answer.toLowerCase().includes('не съм решил');
    });

    const allRequiredComplete = missingFields.length === 0 && requiredFields.length > 0;

    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const nextQuestion = questionsToAsk[currentQuestionIndex + 1];
    const isLastQuestion = currentQuestionIndex >= questionsToAsk.length - 1;

    // Get bot-specific configuration
    const botConfig = botConfigs[stepTitle] || { role: "AI Асистент", systemPromptAddition: "" };

    const systemPrompt = `Ти си ${botConfig.role} – приятелски AI бизнес консултант.
Текуща секция: ${stepTitle}

${botConfig.systemPromptAddition}

${previousStepsContext}${previousAnswersContext}${storedContext}

📊 СЪБРАНА ИНФОРМАЦИЯ В ТАЗИ СЕКЦИЯ:
${currentAnswersContext || 'Все още няма събрана информация.'}

${missingFields.length > 0 ? `⚠️ ОЩЕ ЛИПСВАЩИ ЗАДЪЛЖИТЕЛНИ ПОЛЕТА: ${missingFields.join(', ')}` : '✅ Всички задължителни полета са попълнени!'}

ТЕКУЩ ВЪПРОС:
${currentQuestion?.question || 'Няма текущ въпрос'}

ТВОИТЕ ЗАДАЧИ:
1. Приеми отговора любезно и потвърди, че си го разбрал
2. Ако отговорът е неясен, непълен или съдържа "не знам" – помогни да уточни
3. ${isLastQuestion && allRequiredComplete
    ? `Всички въпроси са зададени. Благодари и кажи: "${completionMessage}"`
    : isLastQuestion && !allRequiredComplete
    ? `Последният въпрос е зададен, но липсват данни за: ${missingFields.join(', ')}. Помоли потребителя да уточни.`
    : `Задай следващия въпрос: "${nextQuestion?.question}"`}

ГЛОБАЛНИ ПРАВИЛА:
- Задавай максимум 3 въпроса наведнъж
- НЕ преминавай напред по предположение
- Използвай информацията от предишните стъпки за контекст
- Бъди кратък и приятелски
- Използвай емотикони умерено`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-15).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
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
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
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

    // Check if step is complete now
    const nowMissingFields = requiredFields.filter(field => {
      const answer = updatedAnswers[field];
      return !answer || 
             answer.trim().length === 0 || 
             answer.toLowerCase().includes('не знам') ||
             answer.toLowerCase().includes('не съм решил');
    });

    const stepComplete = nowMissingFields.length === 0 && requiredFields.length > 0 && isLastQuestion;

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
