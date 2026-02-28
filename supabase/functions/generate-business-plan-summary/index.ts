import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InputSchema = z.object({
  projectId: z.string().uuid(),
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

    const { projectId } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch all plan steps with generated content
    const { data: planSteps, error: stepsError } = await supabaseClient
      .from("plan_steps")
      .select("step_number, step_title, generated_content, step_answers, bot_context")
      .eq("project_id", projectId)
      .not("generated_content", "is", null)
      .order("step_number", { ascending: true });

    if (stepsError) {
      console.error("Error fetching plan steps:", stepsError);
      throw new Error("Failed to fetch plan steps");
    }

    if (!planSteps || planSteps.length === 0) {
      return new Response(
        JSON.stringify({ error: "No generated content found for this project" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user message with all plan step data
    const stepsContent = planSteps
      .map(step => `--- Стъпка ${step.step_number}: ${step.step_title} ---
Генерирано съдържание: ${step.generated_content}
Отговори на въпроси: ${JSON.stringify(step.step_answers)}
Контекст: ${step.bot_context}`)
      .join("\n\n");

    const userMessage = `Ето данните от маркетинговия план:\n\n${stepsContent}`;

    const systemPrompt = `Ти си експерт по бизнес планиране. Твоята задача е да синтезираш информацията от маркетинговия план в цялостно резюме на бизнес плана.

Създай структурирано резюме в Markdown формат със следните секции:
## Резюме
Кратък преглед на бизнеса и основните цели.

## Описание на бизнеса
Какво представлява бизнесът, продукти/услуги, целева аудитория.

## Анализ на пазара
Пазарна среда, конкуренти, тенденции, възможности.

## Маркетингова стратегия
Канали, тактики, позициониране, ценова политика.

## Оперативен план
Процеси, ресурси, график за изпълнение.

## Финансови прогнози
Очаквани приходи, разходи, рентабилност.

## Заключение
Обобщение и следващи стъпки.

Бъди конкретен, използвай данните от маркетинговия план. Пиши на български език.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
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
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No content in response");
    }

    // Save the summary to business_plans table
    const { error: updateError } = await supabaseClient
      .from("business_plans")
      .update({
        summary,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", projectId);

    if (updateError) {
      console.error("Error saving summary:", updateError);
      throw new Error("Failed to save summary");
    }

    return new Response(
      JSON.stringify({ summary }),
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
