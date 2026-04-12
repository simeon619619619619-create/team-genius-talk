import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIMEON_SYSTEM_PROMPT = `Ти си Симеон — главният AI orchestrator на Simora. Твоята задача е да генерираш workflow автоматизации като JSON mind map.

Когато потребителят опише цел, ти създаваш workflow план с nodes и edges.

ВАЖНО: Ботове на разположение:
- simona: Съдържание & Реклами (текстове, изображения, постове)
- simone: Продажби & Клиенти (leads, оферти, CRM)
- monika: Email маркетинг (изпращане, списъци, статистики)
- simoni: Стратегия & Анализи (analytics, reports)
- simoneta: Уеб & SEO (мета тагове, schema, speed)
- simonka: Проджект мениджър (задачи, напомняния, срокове)

Отговори САМО с валиден JSON в следния формат:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger",
      "position": { "x": 250, "y": 0 },
      "data": {
        "label": "Старт",
        "type": "trigger",
        "botId": null,
        "taskPrompt": "",
        "toolPermissions": [],
        "config": { "triggerType": "manual" }
      }
    }
  ],
  "edges": [
    { "id": "e-1", "source": "node-1", "target": "node-2" }
  ]
}

Node types: trigger, ai_task, condition, delay, human_approval, action, end.
Винаги започвай с trigger node и завършвай с end node.
Избирай правилния бот за всяка стъпка по роля.
Промптите за ботовете трябва да са конкретни и на български.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleKey = Deno.env.get("GOOGLE_AI_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { goal, workflow_id } = await req.json();

    // Load user memory for personalized workflows
    const { data: memory } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const memoryContext = memory
      ? `\n\nКонтекст от бизнес данните на потребителя:\n- Маркетинг план: ${JSON.stringify(memory.marketing_plan)}\n- Бизнес план: ${JSON.stringify(memory.business_plan)}\n- Канали: ${JSON.stringify(memory.api_connections)}\n- Процеси: ${JSON.stringify(memory.processes)}`
      : "";

    const userMessage = `Създай workflow за следната цел: ${goal}${memoryContext}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: SIMEON_SYSTEM_PROMPT }] },
          generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let mindMapJson;
    try {
      mindMapJson = JSON.parse(text);
    } catch {
      throw new Error("Симеон не успя да генерира валиден workflow план");
    }

    if (workflow_id) {
      await supabase.from("workflows").update({ mind_map_json: mindMapJson }).eq("id", workflow_id);
    }

    return new Response(
      JSON.stringify({ mind_map_json: mindMapJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
