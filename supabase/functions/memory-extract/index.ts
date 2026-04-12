import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODULE_TO_MEMORY_SECTION: Record<string, string> = {
  vision: "methodology_data",
  research: "methodology_data",
  offer: "marketing_plan",
  copy: "marketing_plan",
  traffic: "marketing_plan",
};

const EXTRACT_PROMPT = `Ти анализираш разговор от бизнес модул и извличаш СТРУКТУРИРАНИ данни.
Върни САМО валиден JSON обект с ключови решения, НЕ суров текст.
Примерен формат:
{
  "target_audience": "жени 25-40, София",
  "channels": ["Instagram", "Email"],
  "budget": "500лв/месец",
  "key_decisions": ["решение 1", "решение 2"],
  "kpis": ["100 leads/месец"]
}
Извлечи САМО конкретни данни — без обобщения или описания.`;

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

    const { module_key, chat_messages } = await req.json();

    const memorySection = MODULE_TO_MEMORY_SECTION[module_key];
    if (!memorySection) {
      return new Response(JSON.stringify({ error: "Unknown module" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const conversationText = chat_messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n")
      .slice(-8000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `Модул: ${module_key}\n\nРазговор:\n${conversationText}` }] }],
          systemInstruction: { parts: [{ text: EXTRACT_PROMPT }] },
          generationConfig: { maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let extractedData;
    try {
      extractedData = JSON.parse(text);
    } catch {
      extractedData = { raw_summary: text };
    }

    const { data: existing } = await supabase
      .from("user_memory")
      .select(memorySection)
      .eq("user_id", user.id)
      .maybeSingle();

    const existingData = existing?.[memorySection as keyof typeof existing] || {};
    const mergedData = { ...existingData as object, ...extractedData, _updated: new Date().toISOString() };

    await supabase
      .from("user_memory")
      .upsert(
        { user_id: user.id, [memorySection]: mergedData },
        { onConflict: "user_id" }
      );

    return new Response(
      JSON.stringify({ section: memorySection, extracted: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
