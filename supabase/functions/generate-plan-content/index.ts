import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum sizes for input validation to prevent resource exhaustion
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_INSTRUCTIONS_LENGTH = 5000;
const MAX_CONTENT_LENGTH = 10000;
const MAX_STEPS = 20;

const InputSchema = z.object({
  stepId: z.string().uuid(),
  botId: z.string().uuid(),
  stepTitle: z.string().max(MAX_TITLE_LENGTH, "Step title must be under 200 characters"),
  stepDescription: z.string().max(MAX_DESCRIPTION_LENGTH, "Step description must be under 1000 characters"),
  botInstructions: z.string().max(MAX_INSTRUCTIONS_LENGTH, "Bot instructions must be under 5000 characters"),
  botName: z.string().max(100, "Bot name must be under 100 characters"),
  model: z.string().max(100).optional(),
  projectId: z.string().uuid(),
  allSteps: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().max(MAX_TITLE_LENGTH),
    order: z.number().int().min(0).max(100),
    generated_content: z.string().max(MAX_CONTENT_LENGTH).nullable(),
  })).max(MAX_STEPS, "Maximum 20 steps allowed").optional(),
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

    const { stepId, stepTitle, stepDescription, botInstructions, botName, model, projectId, allSteps } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch existing context from previous steps
    const { data: contextData } = await supabaseClient
      .from('bot_context')
      .select('context_key, context_value, step_id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    // Build context summary from previous steps
    let previousStepsContext = "";
    if (allSteps && allSteps.length > 0) {
      const currentStepOrder = allSteps.find(s => s.id === stepId)?.order || 999;
      const previousSteps = allSteps
        .filter(s => s.order < currentStepOrder && s.generated_content)
        .sort((a, b) => a.order - b.order);

      if (previousSteps.length > 0) {
        previousStepsContext = `\n\nИНФОРМАЦИЯ ОТ ПРЕДИШНИ СТЪПКИ (използвай тази информация за контекст):
${previousSteps.map(s => `
=== ${s.title} ===
${s.generated_content?.substring(0, 1500)}${(s.generated_content?.length || 0) > 1500 ? '...' : ''}
`).join('\n')}`;
      }
    }

    // Add any stored context
    let storedContext = "";
    if (contextData && contextData.length > 0) {
      storedContext = `\n\nСЪХРАНЕН КОНТЕКСТ ОТ ДРУГИ БОТОВЕ:
${contextData.map(c => `- ${c.context_key}: ${c.context_value}`).join('\n')}`;
    }

    const systemPrompt = `Ти си AI бот на име "${botName}". Твоята задача е да изпълняваш инструкциите, които ти са дадени от потребителя.

ТВОИТЕ ИНСТРУКЦИИ:
${botInstructions}
${previousStepsContext}
${storedContext}

Сега работиш върху следната стъпка от бизнес плана:
- Заглавие: ${stepTitle}
- Описание: ${stepDescription}

ВАЖНО: Използвай информацията от предишните стъпки за да създадеш последователен и свързан бизнес план. Референцирай конкретни решения и данни от предишните секции.

Създай подробно, структурирано и професионално съдържание за тази секция. Използвай markdown форматиране за по-добра четимост.

В края на отговора си, добави секция "## Ключови точки за следващите стъпки:" с 3-5 важни факта, които другите ботове трябва да знаят.`;

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
          { role: "user", content: `Генерирай съдържание за секцията "${stepTitle}".` },
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    // Update the plan step with the generated content
    const { error: updateError } = await supabaseClient
      .from('plan_steps')
      .update({ 
        generated_content: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', stepId);

    if (updateError) {
      console.error("Error updating plan step:", updateError);
    }

    // Extract and store key points for other bots
    const keyPointsMatch = content.match(/## Ключови точки за следващите стъпки:([\s\S]*?)(?:$|##)/);
    if (keyPointsMatch) {
      const keyPoints = keyPointsMatch[1].trim();
      
      // Upsert context
      await supabaseClient
        .from('bot_context')
        .upsert({
          project_id: projectId,
          bot_id: rawInput.botId,
          step_id: stepId,
          context_key: `${stepTitle}_key_points`,
          context_value: keyPoints,
        }, {
          onConflict: 'project_id,step_id,context_key'
        });
    }

    return new Response(
      JSON.stringify({ content, botName }),
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
