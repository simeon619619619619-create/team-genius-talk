import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map of step questions that can be pre-filled from methodology
const STEP_QUESTIONS: Record<string, { stepTitle: string; questions: { key: string; question: string }[] }> = {
  "Резюме на бизнеса": {
    stepTitle: "Резюме на бизнеса",
    questions: [
      { key: "business_type", question: "Какъв е бизнесът? (продукт, услуга, SaaS, обучение...)" },
      { key: "target_audience", question: "За кого е предназначен? Коя е основната аудитория?" },
      { key: "problem_solved", question: "Какъв проблем решава?" },
      { key: "revenue_model", question: "Как печели пари бизнесът?" },
      { key: "main_goal", question: "Каква е основната цел?" },
    ],
  },
  "Пазарен анализ": {
    stepTitle: "Пазарен анализ",
    questions: [
      { key: "competitors", question: "Кои са основните конкуренти?" },
      { key: "buying_behavior", question: "Как клиентите купуват подобни решения?" },
      { key: "alternatives", question: "Какви са алтернативите за клиентите?" },
      { key: "market_prices", question: "Какви са приблизителните цени на пазара?" },
      { key: "entry_barriers", question: "Какви са основните бариери за влизане?" },
    ],
  },
  "Маркетинг стратегия": {
    stepTitle: "Маркетинг стратегия",
    questions: [
      { key: "positioning", question: "Какво е основното позициониране?" },
      { key: "marketing_channels", question: "Кои маркетинг канали ще се използват?" },
      { key: "main_message", question: "Какво е основното послание към клиентите?" },
      { key: "lead_mechanism", question: "Какъв е lead магнитът или hook-ът?" },
      { key: "cta", question: "Каква е следващата стъпка за клиента (CTA)?" },
    ],
  },
};

// Which modules map to which step questions
const MODULE_TO_STEP_MAPPING: Record<string, string[]> = {
  vision: ["Резюме на бизнеса"],
  research: ["Резюме на бизнеса", "Пазарен анализ"],
  offer: ["Резюме на бизнеса", "Пазарен анализ"],
  copy: ["Маркетинг стратегия"],
  traffic: ["Маркетинг стратегия"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";

    // 1. Get all module completions with chat summaries
    const { data: completions } = await supabase
      .from("module_completions")
      .select("module_key, chat_summary")
      .eq("user_id", userId);

    if (!completions || completions.length === 0) {
      return new Response(JSON.stringify({ answers: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build context from all module summaries
    const moduleSummaries = completions
      .filter((c: any) => c.chat_summary)
      .map((c: any) => `=== Модул: ${c.module_key} ===\n${c.chat_summary.substring(0, 3000)}`)
      .join("\n\n");

    if (!moduleSummaries) {
      return new Response(JSON.stringify({ answers: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Build the extraction prompt
    const allQuestions: { stepTitle: string; key: string; question: string }[] = [];
    for (const [stepTitle, config] of Object.entries(STEP_QUESTIONS)) {
      for (const q of config.questions) {
        allQuestions.push({ stepTitle, key: q.key, question: q.question });
      }
    }

    const questionsText = allQuestions
      .map((q, i) => `${i + 1}. [${q.stepTitle}] ${q.key}: ${q.question}`)
      .join("\n");

    const prompt = `Анализирай следните разговори от бизнес методология модулите и извлечи отговори за маркетинг плана.

РАЗГОВОРИ ОТ МОДУЛИТЕ:
${moduleSummaries}

ВЪПРОСИ ЗА ПОПЪЛВАНЕ:
${questionsText}

ИНСТРУКЦИИ:
- За всеки въпрос, извлечи конкретен отговор от разговорите
- Ако информацията не е налична в разговорите, НЕ измисляй — пропусни (не включвай в JSON)
- Отговаряй кратко и конкретно (1-3 изречения)
- Отговаряй на български

Върни САМО валиден JSON обект в този формат (без markdown, без \`\`\`):
{"business_type": "отговор", "target_audience": "отговор", ...}

Включи САМО ключове за които има ясна информация в разговорите.`;

    // 4. Call Claude to extract
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return new Response(JSON.stringify({ answers: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "{}";

    // Parse JSON from response
    let answers: Record<string, string> = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        answers = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse extraction result:", e);
    }

    return new Response(JSON.stringify({ answers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Prefill error:", error);
    return new Response(JSON.stringify({ answers: {}, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
