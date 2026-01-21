import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InputSchema = z.object({
  stepId: z.string().uuid(),
  projectId: z.string().uuid(),
  stepTitle: z.string(),
  userMessage: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  collectedAnswers: z.record(z.string()).optional(),
  questionsToAsk: z.array(z.object({
    key: z.string(),
    question: z.string(),
  })),
  currentQuestionIndex: z.number(),
});

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
      currentQuestionIndex 
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

    // Build context from collected answers
    const answersContext = Object.entries(collectedAnswers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const nextQuestion = questionsToAsk[currentQuestionIndex + 1];
    const isLastQuestion = currentQuestionIndex >= questionsToAsk.length - 1;

    const systemPrompt = `Ти си приятелски AI бизнес консултант, който събира информация за бизнес план.
Текуща секция: ${stepTitle}

СЪБРАНА ИНФОРМАЦИЯ ДОСЕГА:
${answersContext || 'Все още няма събрана информация.'}

ТЕКУЩ ВЪПРОС, НА КОЙТО ПОТРЕБИТЕЛЯТ ОТГОВАРЯ:
${currentQuestion?.question || 'Няма текущ въпрос'}

ТВОИТЕ ЗАДАЧИ:
1. Приеми отговора на потребителя любезно и потвърди, че си го разбрал
2. Ако отговорът е неясен или непълен, помоли за уточнение
3. ${isLastQuestion 
  ? 'Това беше последният въпрос - благодари на потребителя и обобщи накратко събраната информация' 
  : `Задай следващия въпрос: "${nextQuestion?.question}"`}

ВАЖНО:
- Бъди кратък и приятелски
- Използвай емотикони умерено
- Не повтаряй информация, която вече си събрал
- Ако потребителят иска да напише сам (не чрез въпроси), уважи това и го насочи да напише свободно`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
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

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        nextQuestionIndex: isLastQuestion ? -1 : currentQuestionIndex + 1,
        isComplete: isLastQuestion,
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
