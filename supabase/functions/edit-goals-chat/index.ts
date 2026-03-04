import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, goals } = await req.json() as { messages: Message[]; goals: Goal[] };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const goalsContext = goals.map((g, i) => 
      `${i + 1}. "${g.title}" (категория: ${g.category}, приоритет: ${g.priority}):\n   ${g.description || 'Няма описание'}`
    ).join("\n\n");

    const systemPrompt = `Ти си експерт бизнес консултант. Анализирай текущите годишни цели и предложи конкретни подобрения.

ТЕКУЩИ ГОДИШНИ ЦЕЛИ:
${goalsContext}

ТВОЯТА ЗАДАЧА:
1. Анализирай всяка цел критично
2. Идентифицирай проблеми: неясни формулировки, липса на измерими показатели, нереалистични очаквания
3. Предложи КОНКРЕТНИ подобрения за всяка цел
4. Формулирай целите по SMART методологията (Specific, Measurable, Achievable, Relevant, Time-bound)

ФОРМАТ НА ОТГОВОР:
Започни с кратък анализ на проблемите, след това предложи редакции.

За всяка промяна, добави JSON блок:
\`\`\`json
{
  "action": "edit",
  "goalIndex": 0,
  "changes": {
    "title": "По-кратко, ясно заглавие",
    "description": "Конкретно описание с измерими KPI показатели, срокове и очаквани резултати",
    "category": "growth",
    "priority": "high"
  }
}
\`\`\`

За добавяне на нова цел:
\`\`\`json
{
  "action": "add",
  "changes": {
    "title": "Заглавие на нова цел",
    "description": "Описание",
    "category": "revenue",
    "priority": "medium"
  }
}
\`\`\`

КАТЕГОРИИ: revenue (Приходи), growth (Растеж), efficiency (Ефективност), innovation (Иновации), other (Друго)
ПРИОРИТЕТИ: high, medium, low

Отговаряй САМО на български език. Бъди кратък и конкретен.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
