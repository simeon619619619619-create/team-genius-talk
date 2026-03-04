import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InputSchema = z.object({
  projectId: z.string().uuid(),
  weeksToGenerate: z.number().int().min(1).max(12).default(4),
});

interface ScheduleTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  weekNumber: number;
  timeSlot: string;
  taskType: "marketing" | "sales" | "content" | "admin" | "meeting";
  channel?: string;
}

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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawInput = await req.json();
    const validationResult = InputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, weeksToGenerate } = validationResult.data;

    // Fetch all bot_context for this project
    const { data: contextData, error: contextError } = await supabaseClient
      .from('bot_context')
      .select('context_key, context_value')
      .eq('project_id', projectId);

    if (contextError) {
      console.error("Error fetching context:", contextError);
      throw new Error("Failed to fetch business context");
    }

    // Build context object
    const businessContext: Record<string, string> = {};
    contextData?.forEach(item => {
      businessContext[item.context_key] = item.context_value;
    });

    // Check if we have required context
    const requiredKeys = ['hours_per_day', 'preferred_work_hours', 'marketing_channels', 'weekly_activities'];
    const missingKeys = requiredKeys.filter(key => !businessContext[key]);
    
    if (missingKeys.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required context", 
          missingFields: missingKeys,
          message: "Моля, завършете всички стъпки от маркетинг плана преди генериране на седмичен план."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate start week (current week)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

    const systemPrompt = `Ти си експерт бизнес планировчик. Създай детайлен седмичен план за ${weeksToGenerate} седмици, започващ от седмица ${currentWeek}.

БИЗНЕС КОНТЕКСТ:
- Тип бизнес: ${businessContext.business_type || 'Не е посочен'}
- Целева аудитория: ${businessContext.target_audience || 'Не е посочена'}
- Екип: ${businessContext.team_size || 'Не е посочен'}
- Налични часове на ден: ${businessContext.hours_per_day || '4-6 часа'}
- Предпочитани работни часове: ${businessContext.preferred_work_hours || 'Не са посочени'}
- Маркетинг канали: ${businessContext.marketing_channels || 'Не са посочени'}
- Продажбени канали: ${businessContext.sales_channels || 'Не са посочени'}
- Седмични дейности: ${businessContext.weekly_activities || 'Не са посочени'}
- Цели за месец 1: ${businessContext.monthly_goals_1 || 'Не са посочени'}
- Цели за месец 3: ${businessContext.monthly_goals_3 || 'Не са посочени'}
- Позициониране: ${businessContext.positioning || 'Не е посочено'}
- Основно послание: ${businessContext.main_message || 'Не е посочено'}
- Приоритети: ${businessContext.priorities || 'Не са посочени'}
- Маркетинг бюджет: ${businessContext.marketing_budget || 'Не е посочен'}

ПРАВИЛА ЗА ПЛАНИРАНЕ:
1. Разпредели задачите само в работни дни (понеделник-петък)
2. Съобрази с наличните часове на ден - не надвишавай ${businessContext.hours_per_day || '6'} часа работа
3. Задачите да са в предпочитаните работни часове: ${businessContext.preferred_work_hours || 'сутрин'}
4. Всяка седмица да включва:
   - Маркетинг дейности за избраните канали
   - Създаване на съдържание
   - Продажбени дейности
   - Административни задачи (1-2 часа седмично)
5. Високоприоритетните задачи в началото на седмицата
6. Групирай свързани задачи
7. Дай реалистични времеви слотове (напр. "09:00-11:00", "14:00-16:00")

ФОРМАТ НА TIMEСЛОТ:
Използвай конкретни часове базирани на предпочитанията: ${businessContext.preferred_work_hours || 'сутрин 9:00-12:00'}.

Отговори САМО с валиден JSON масив. Пример:
[
  {
    "title": "Създаване на Instagram пост",
    "description": "Подготви визуално съдържание за Instagram Stories",
    "priority": "high",
    "estimatedHours": 2,
    "dayOfWeek": 1,
    "weekNumber": ${currentWeek},
    "timeSlot": "09:00-11:00",
    "taskType": "content",
    "channel": "Instagram"
  }
]

Генерирай 15-25 задачи за всяка седмица, общо ${weeksToGenerate * 20} задачи.`;

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
          { role: "user", content: `Генерирай детайлен седмичен план за ${weeksToGenerate} седмици, започващ от седмица ${currentWeek}, ${now.getFullYear()} година.` },
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

    let tasks: ScheduleTask[];
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      tasks = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Group tasks by week for easier consumption
    const tasksByWeek: Record<number, ScheduleTask[]> = {};
    tasks.forEach(task => {
      if (!tasksByWeek[task.weekNumber]) {
        tasksByWeek[task.weekNumber] = [];
      }
      tasksByWeek[task.weekNumber].push(task);
    });

    return new Response(
      JSON.stringify({ 
        tasks,
        tasksByWeek,
        startWeek: currentWeek,
        weeksGenerated: weeksToGenerate,
        businessContext: {
          hoursPerDay: businessContext.hours_per_day,
          preferredHours: businessContext.preferred_work_hours,
          channels: businessContext.marketing_channels
        }
      }),
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
