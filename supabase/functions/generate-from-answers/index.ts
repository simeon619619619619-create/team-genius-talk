import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum sizes for input validation to prevent resource exhaustion
const MAX_TITLE_LENGTH = 200;
const MAX_CONTEXT_LENGTH = 10000;
const MAX_INSTRUCTIONS_LENGTH = 5000;

const InputSchema = z.object({
  stepId: z.string().uuid(),
  projectId: z.string().uuid(),
  stepTitle: z.string().max(MAX_TITLE_LENGTH, "Step title must be under 200 characters"),
  answersContext: z.string().max(MAX_CONTEXT_LENGTH, "Answers context must be under 10000 characters"),
  botInstructions: z.string().max(MAX_INSTRUCTIONS_LENGTH, "Bot instructions must be under 5000 characters"),
  botName: z.string().max(100, "Bot name must be under 100 characters"),
  model: z.string().max(100).optional(),
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

    const { stepId, projectId, stepTitle, answersContext, botInstructions, botName, model } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch previous steps content for context
    const { data: allSteps } = await supabaseClient
      .from('plan_steps')
      .select('title, step_order, generated_content')
      .eq('project_id', projectId)
      .order('step_order');

    const currentStepData = allSteps?.find(s => s.title === stepTitle);
    const previousStepsContext = allSteps
      ?.filter(s => s.step_order < (currentStepData?.step_order || 999) && s.generated_content)
      .map(s => `=== ${s.title} ===\n${s.generated_content?.substring(0, 1000)}`)
      .join('\n\n') || '';

    const systemPrompt = `Ти си ${botName}, експертен AI бизнес консултант.

${botInstructions ? `ТВОИТЕ ИНСТРУКЦИИ:\n${botInstructions}\n\n` : ''}

СЪБРАНА ИНФОРМАЦИЯ ОТ ПОТРЕБИТЕЛЯ:
${answersContext}

${previousStepsContext ? `КОНТЕКСТ ОТ ПРЕДИШНИ СЕКЦИИ:\n${previousStepsContext}\n\n` : ''}

ТВОЯТА ЗАДАЧА:
Създай подробна, структурирана и професионална секция "${stepTitle}" за бизнес план, базирана на събраната информация от потребителя.

ФОРМАТ:
- Използвай Markdown форматиране
- Включи релевантни заглавия и подзаглавия
- Добави bullets за лесно четене
- Бъди конкретен и практичен
- Използвай информацията, която потребителят е предоставил
- Направи връзки с предишните секции, ако има такива`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Генерирай професионална секция "${stepTitle}" за бизнес плана, базирана на събраната информация.` },
        ],
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
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    // Update the plan step
    await supabaseClient
      .from('plan_steps')
      .update({ 
        generated_content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', stepId);

    return new Response(
      JSON.stringify({ content }),
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
