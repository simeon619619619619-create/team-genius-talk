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

// Extract emails from HTML text
function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  // Filter out common false positives
  return [...new Set(matches)].filter(e =>
    !e.includes('example.com') &&
    !e.includes('wixpress') &&
    !e.includes('sentry') &&
    !e.endsWith('.png') &&
    !e.endsWith('.jpg')
  ).slice(0, 5);
}

// Extract phone numbers from HTML text (Bulgarian format)
function extractPhones(text: string): string[] {
  const phoneRegex = /(?:\+359|0)[\s.-]?(?:\d[\s.-]?){8,9}/g;
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches.map(p => p.replace(/[\s.-]/g, '')))].slice(0, 3);
}

// Fetch a webpage and extract contact info
async function scrapeWebsite(url: string): Promise<{ emails: string[]; phones: string[] }> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SimoraBot/1.0)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return { emails: [], phones: [] };

    const html = await res.text();
    const emails = extractEmails(html);
    const phones = extractPhones(html);

    // Also try /contacts or /kontakti page
    if (emails.length === 0 && phones.length === 0) {
      for (const contactPath of ['/contacts', '/kontakti', '/contact', '/за-контакти', '/контакти']) {
        try {
          const contactUrl = new URL(contactPath, fullUrl).href;
          const cRes = await fetch(contactUrl, {
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SimoraBot/1.0)' },
          });
          if (cRes.ok) {
            const cHtml = await cRes.text();
            emails.push(...extractEmails(cHtml));
            phones.push(...extractPhones(cHtml));
            if (emails.length > 0 || phones.length > 0) break;
          }
        } catch { /* skip */ }
      }
    }

    return {
      emails: [...new Set(emails)].slice(0, 3),
      phones: [...new Set(phones)].slice(0, 3)
    };
  } catch {
    return { emails: [], phones: [] };
  }
}

// Search Google for businesses
async function searchGoogle(query: string): Promise<string[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(
      `https://www.google.com/search?q=${encodedQuery}&num=15&hl=bg`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'bg,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return [];

    const html = await res.text();
    // Extract URLs from Google results
    const urlRegex = /https?:\/\/(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)(?:\/[^\s"<>)]*)?/g;
    const matches = html.match(urlRegex) || [];

    // Filter out Google's own URLs and common non-business sites
    const excluded = ['google.', 'youtube.', 'facebook.com/share', 'twitter.', 'wikipedia.', 'reddit.'];
    const urls = [...new Set(matches)]
      .filter(u => !excluded.some(e => u.includes(e)))
      .slice(0, 15);

    return urls;
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Не си автентикиран" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Невалиден токен" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin
    const adminEmails = ["info@eufashioninstitute.com", "simeon619619619619@gmail.com"];
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminEmails.includes(user.email || "") && !roleData) {
      return new Response(JSON.stringify({ error: "Нямаш админ достъп" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as ScrapeRequest;
    const { niche, city, country } = body;
    const nicheId = body.nicheId === "none" || !body.nicheId ? null : body.nicheId;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY не е конфигуриран" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const location = [city, country || "България"].filter(Boolean).join(", ");

    // Step 1: Search Google for real businesses
    const searchQuery = `${niche} ${city || "България"} фирми контакти телефон`;
    const googleUrls = await searchGoogle(searchQuery);

    // Step 2: Scrape each URL for contact info
    const scrapedData: { url: string; emails: string[]; phones: string[] }[] = [];

    // Scrape up to 10 URLs in parallel (batches of 5)
    for (let i = 0; i < Math.min(googleUrls.length, 10); i += 5) {
      const batch = googleUrls.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const data = await scrapeWebsite(url);
          return { url, ...data };
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && (r.value.emails.length > 0 || r.value.phones.length > 0)) {
          scrapedData.push(r.value);
        }
      }
    }

    // Step 3: Use AI in batches to get ALL businesses
    const scrapedContext = scrapedData.length > 0
      ? `\n\nОт уеб скрейпинг намерих тези контакти:\n${scrapedData.map(s =>
          `- ${s.url}: имейли=[${s.emails.join(', ')}], телефони=[${s.phones.join(', ')}]`
        ).join('\n')}`
      : '';

    const allBusinesses: any[] = [];
    const MAX_ROUNDS = 4; // Up to 4 rounds × 25 = 100 businesses max

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const alreadyFound = allBusinesses.map(b => b.company_name).join(", ");
      const excludeClause = round > 0
        ? `\n\nВЕЧЕ НАМЕРЕНИ (НЕ ги повтаряй): ${alreadyFound}`
        : '';

      const batchPrompt = `Ти си експерт по бизнес данни в България. Генерирай списък от 25 РЕАЛНИ фирми/брандове в ниша "${niche}" в ${location}.
${scrapedContext}${excludeClause}

За всяка фирма дай JSON обект с:
- company_name, website, email, phone (формат +359...), instagram, facebook
- address, city, description (1-2 изречения), employee_count ("1-10"/"11-50"/"51-200"/"200+")
- contact_person, contact_role, tags (масив)

ПРАВИЛА:
- САМО реални, съществуващи фирми/брандове
- Използвай данните от скрейпинга ако съвпадат
- Включи ВСИЧКИ които знаеш — големи и малки, популярни и по-малко известни
- НЕ повтаряй вече намерените фирми
- Ако не знаеш контакт, сложи null
- Върни САМО валиден JSON масив
- Ако няма повече фирми, върни празен масив []`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{ role: "user", content: batchPrompt }],
        }),
      });

      if (!response.ok) {
        if (round === 0) {
          const errText = await response.text();
          return new Response(JSON.stringify({ error: "AI API грешка", details: errText }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break; // Stop batching on error after first round
      }

      const aiResult = await response.json();
      const textContent = aiResult.content?.[0]?.text || "[]";

      let batch;
      try {
        const jsonMatch = textContent.match(/\[[\s\S]*\]/);
        batch = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        if (round === 0) {
          return new Response(JSON.stringify({
            error: "Не можах да парсна AI отговора",
            raw: textContent.slice(0, 500)
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      if (batch.length === 0) break; // AI says no more

      allBusinesses.push(...batch);

      // If AI returned fewer than 15, probably exhausted
      if (batch.length < 15) break;
    }

    const businesses = allBusinesses;

    // Step 4: For businesses with websites but no contacts, try scraping their sites directly
    for (const biz of businesses) {
      if (biz.website && (!biz.email || !biz.phone)) {
        try {
          const scraped = await scrapeWebsite(biz.website);
          if (!biz.email && scraped.emails.length > 0) biz.email = scraped.emails[0];
          if (!biz.phone && scraped.phones.length > 0) biz.phone = scraped.phones[0];
        } catch { /* skip */ }
      }
    }

    // Fetch all niches for auto-matching
    const { data: allNiches } = await supabase
      .from("business_niches")
      .select("id, name");

    const nicheKeywords: Record<string, string[]> = {
      "Ресторанти и кафенета": ["ресторант", "кафе", "заведение", "храна", "бар", "пицария", "бистро", "кухня", "кетъринг", "restaurant", "cafe", "food"],
      "Фитнес и спорт": ["фитнес", "спорт", "треньор", "зала", "тренировк", "gym", "fitness", "yoga", "йога"],
      "Красота и козметика": ["красота", "козметик", "салон", "фризьор", "маникюр", "масаж", "beauty", "salon", "spa"],
      "Мода и облекло": ["мода", "дрехи", "облекло", "бутик", "fashion", "магазин за дрехи", "текстил", "обувки"],
      "Здраве и медицина": ["здраве", "медицин", "клиник", "лекар", "аптека", "стоматолог", "дентал", "болница", "health"],
      "Образование": ["образовани", "училищ", "курс", "академи", "обучени", "школа", "education", "university"],
      "IT и технологии": ["IT", "софтуер", "технолог", "програмиране", "уеб", "web", "software", "digital", "app", "developer"],
      "Недвижими имоти": ["имот", "недвижим", "брокер", "строител", "real estate", "апартамент", "наем"],
      "Автомобили": ["авто", "кола", "сервиз", "части", "car", "auto", "garage", "гараж"],
      "Туризъм и хотели": ["хотел", "туриз", "екскурзи", "hotel", "travel", "почивк", "tourism"],
      "Юридически услуги": ["адвокат", "юрист", "нотариус", "счетовод", "право", "legal", "law"],
      "Маркетинг и реклама": ["маркетинг", "реклам", "PR", "дигитал", "SEO", "marketing", "agency", "агенци"],
      "Е-commerce": ["онлайн магазин", "e-commerce", "ecommerce", "shop", "дропшипинг", "онлайн продажб"],
      "Фотография и видео": ["фотограф", "видео", "photo", "video", "студио", "снимк"],
      "Събития и кетъринг": ["събити", "кетъринг", "DJ", "парти", "сватб", "event", "catering"],
    };

    function autoMatchNiche(biz: any): string | null {
      if (nicheId) return nicheId; // User explicitly chose
      if (!allNiches) return null;

      const searchText = [
        biz.company_name,
        biz.description,
        ...(biz.tags || []),
        niche, // the search query itself
      ].filter(Boolean).join(" ").toLowerCase();

      let bestMatch: string | null = null;
      let bestScore = 0;

      for (const [nicheName, keywords] of Object.entries(nicheKeywords)) {
        let score = 0;
        for (const kw of keywords) {
          if (searchText.includes(kw.toLowerCase())) {
            score += kw.length;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          const found = allNiches.find(n => n.name === nicheName);
          if (found) bestMatch = found.id;
        }
      }

      return bestMatch;
    }

    // Insert into database
    const inserted = [];
    for (const biz of businesses) {
      if (!biz.company_name) continue;

      const matchedNicheId = autoMatchNiche(biz);

      const { data, error } = await supabase
        .from("business_directory")
        .insert({
          niche_id: matchedNicheId,
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
          contact_role: biz.contact_role || null,
          tags: biz.tags || [],
          source: "web_scrape",
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
        scraped_urls: scrapedData.length,
        businesses: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Неочаквана грешка" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
