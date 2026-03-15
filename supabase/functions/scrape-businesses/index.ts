import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapeRequest {
  niche: string;
  city?: string;
  country?: string;
  nicheId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminEmails = ["info@eufashioninstitute.com", "simeon619619619619@gmail.com"];
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminEmails.includes(user.email || "") && !roleData) {
      return new Response(JSON.stringify({ error: "Not admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { niche, city, country, nicheId } = await req.json() as ScrapeRequest;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const location = [city, country || "България"].filter(Boolean).join(", ");

    const prompt = `Ти си изследовател на бизнес данни. Генерирай списък от 10 РЕАЛНИ фирми в ниша "${niche}" в ${location}.

За всяка фирма предостави ТОЧНА и РЕАЛНА информация (не измисляй):
- company_name: Официално име на фирмата
- website: Уебсайт (ако знаеш)
- email: Контактен имейл (ако знаеш)
- phone: Телефон (ако знаеш)
- instagram: Instagram профил без @ (ако знаеш)
- facebook: Facebook страница URL (ако знаеш)
- address: Адрес
- city: Град
- description: Кратко описание на дейността (1-2 изречения)
- employee_count: Приблизителен брой служители ("1-10", "11-50", "51-200", "200+")
- contact_person: Име на собственик/мениджър (ако знаеш)
- tags: Масив от тагове описващи дейността

ВАЖНО:
- Давай САМО фирми за които си сигурен че съществуват
- Ако не знаеш някое поле, сложи null
- Върни JSON масив

Отговори САМО с валиден JSON масив, без друг текст.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "AI API error", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const textContent = aiResult.content?.[0]?.text || "[]";

    // Extract JSON from response
    let businesses;
    try {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      businesses = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: textContent }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into database
    const inserted = [];
    for (const biz of businesses) {
      const { data, error } = await supabase
        .from("business_directory")
        .insert({
          niche_id: nicheId || null,
          company_name: biz.company_name,
          website: biz.website || null,
          email: biz.email || null,
          phone: biz.phone || null,
          instagram: biz.instagram || null,
          facebook: biz.facebook || null,
          address: biz.address || null,
          city: biz.city || city || null,
          country: country || "България",
          description: biz.description || null,
          employee_count: biz.employee_count || null,
          contact_person: biz.contact_person || null,
          tags: biz.tags || [],
          source: "ai_research",
          verified: false,
          collected_by: user.id,
        })
        .select()
        .single();

      if (!error && data) {
        inserted.push(data);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        found: businesses.length,
        inserted: inserted.length,
        businesses: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
