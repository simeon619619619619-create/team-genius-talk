import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const GoalSchema = z.object({
  title: z.string().max(500),
  description: z.string().max(2000),
  category: z.string().max(100),
  priority: z.enum(["high", "medium", "low"]),
});

const PlanItemSchema = z.object({
  type: z.enum(["project", "strategy", "action"]),
  title: z.string().max(500),
  description: z.string().max(2000),
  owner: z.string().max(200).optional(),
  deadline: z.string().optional(),
  expectedResults: z.string().max(2000).optional(),
  priority: z.enum(["high", "medium", "low"]),
});

const WeeklyTasksInputSchema = z.object({
  goals: z.array(GoalSchema).max(50, "Maximum 50 goals allowed"),
  items: z.array(PlanItemSchema).max(100, "Maximum 100 items allowed"),
  weekNumber: z.number().int().min(1).max(53),
  quarter: z.string().max(20),
  year: z.number().int().min(2000).max(2100),
});

interface WeeklyTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  taskType: "project" | "strategy" | "action";
}

interface PlanItem {
  type: "project" | "strategy" | "action";
  title: string;
  description: string;
  owner: string;
  deadline: string;
  expectedResults: string;
  priority: "high" | "medium" | "low";
}

interface Goal {
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const rawInput = await req.json();
    const validationResult = WeeklyTasksInputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors.map(e => e.message).join(", ")
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { goals, items, weekNumber, quarter, year } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const goalsText = (goals as Goal[])
      .map((g) => `- ${g.title} (${g.category}, приоритет: ${g.priority}): ${g.description}`)
      .join("\n");

    const itemsText = (items as PlanItem[])
      .map((i) => `- [${i.type === "project" ? "Проект" : i.type === "strategy" ? "Стратегия" : "Действие"}] ${i.title} (${i.priority}): ${i.description}. Отговорник: ${i.owner || "Не определен"}. Очаквани резултати: ${i.expectedResults || "Не са посочени"}`)
      .join("\n");

    const systemPrompt = `Ти си експерт бизнес консултант и планировчик. Анализирай целите, проектите, стратегиите и действията за ${quarter} на ${year} година и генерирай конкретни седмични задачи за седмица ${weekNumber}.

Правила:
1. Разпредели задачите равномерно през седмицата (понеделник до петък)
2. Съобрази приоритетите - високоприоритетните задачи да са в началото на седмицата
3. Групирай свързани задачи близко една до друга
4. Дай реалистични оценки за време
5. Задачите трябва да са конкретни и изпълними
6. Задай taskType според източника: "project" за проект, "strategy" за стратегия, "action" за действие или цел

ЦЕЛИ:
${goalsText || "Няма добавени цели"}

ПРОЕКТИ/СТРАТЕГИИ/ДЕЙСТВИЯ:
${itemsText || "Няма добавени елементи"}

Отговори САМО с валиден JSON масив. Пример:
[
  {
    "title": "Среща за планиране на маркетинг кампания",
    "description": "Организирай среща с екипа за обсъждане на Q1 маркетинг стратегия",
    "priority": "high",
    "estimatedHours": 2,
    "dayOfWeek": 1,
    "taskType": "project"
  }
]

Генерирай 5-10 задачи за седмицата.`;

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
          { role: "user", content: `Генерирай задачи за седмица ${weekNumber} от ${quarter}, ${year}` },
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

    let tasks: WeeklyTask[];
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      tasks = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(
      JSON.stringify({ tasks }),
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
