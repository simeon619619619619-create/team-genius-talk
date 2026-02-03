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
      `${i + 1}. "${g.title}" (${g.category}, приоритет: ${g.priority}): ${g.description?.substring(0, 200) || 'Няма описание'}`
    ).join("\n");

    const systemPrompt = `Ти си експерт бизнес консултант, който помага на потребителя да подобри годишните цели преди да ги прехвърли в бизнес плана.

ТЕКУЩИ ГОДИШНИ ЦЕЛИ:
${goalsContext}

ИНСТРУКЦИИ:
1. Анализирай целите и предложи подобрения
2. Помогни на потребителя да формулира по-ясни, измерими цели (SMART)
3. Предложи добавяне на нови цели ако липсват важни области
4. Можеш да предложиш редактиране на заглавия, описания, категории или приоритети
5. Отговаряй кратко и конкретно на български

Когато потребителят поиска промяна, отговори с конкретни инструкции какво да се промени и използвай JSON формат за предложения:

\`\`\`json
{
  "action": "edit" | "add" | "delete",
  "goalIndex": 0,
  "changes": {
    "title": "Ново заглавие",
    "description": "Ново описание",
    "category": "growth",
    "priority": "high"
  }
}
\`\`\`

Ако потребителят просто пита или иска съвет, отговори с текст без JSON.`;

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
