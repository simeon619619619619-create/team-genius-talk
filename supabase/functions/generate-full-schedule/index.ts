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
  needsHuman: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawInput = await req.json();
    const validationResult = InputSchema.safeParse(rawInput);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: validationResult.error.errors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { projectId, weeksToGenerate } = validationResult.data;

    // Use service role for cross-table reads
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Gather ALL context from previous steps
    const [
      { data: botContext },
      { data: profile },
      { data: planSteps },
      { data: stepAnswers },
      { data: moduleCompletions },
    ] = await Promise.all([
      supabase.from("bot_context").select("context_key, context_value").eq("project_id", projectId),
      supabase.from("profiles").select("business_profile").eq("user_id", user.id).maybeSingle(),
      supabase.from("plan_steps").select("title, generated_content, completed").eq("project_id", projectId).order("step_order"),
      supabase.from("step_answers").select("question_key, answer").eq("project_id", projectId),
      supabase.from("module_completions").select("module_key, chat_summary").eq("user_id", user.id),
    ]);

    // Build unified context
    const ctx: Record<string, string> = {};
    botContext?.forEach((item: any) => { ctx[item.context_key] = item.context_value; });

    // Add from business profile
    const bp = (profile?.business_profile as any) || {};
    if (bp.website) ctx.website = bp.website;
    if (bp.industry) ctx.industry = bp.industry;
    if (bp.team_size && !ctx.team_size) ctx.team_size = bp.team_size;
    if (bp.main_goal && !ctx.main_goal) ctx.main_goal = bp.main_goal;

    // Add from step answers
    stepAnswers?.forEach((a: any) => { if (!ctx[a.question_key]) ctx[a.question_key] = a.answer; });

    // Build marketing plan summary
    let planSummary = "";
    planSteps?.forEach((s: any) => {
      if (s.generated_content) {
        planSummary += `\n### ${s.title}:\n${s.generated_content.substring(0, 1500)}\n`;
      }
    });

    // Build methodology insights
    let methodologyInsights = "";
    moduleCompletions?.forEach((m: any) => {
      if (m.chat_summary) {
        // Extract just user answers (shorter)
        const userParts = m.chat_summary.split("\n\n")
          .filter((p: string) => p.startsWith("Потребител:"))
          .slice(0, 10)
          .join("\n");
        if (userParts) methodologyInsights += `\n[${m.module_key}]: ${userParts.substring(0, 800)}\n`;
      }
    });

    const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_KEY");
    if (!GOOGLE_AI_KEY) throw new Error("GOOGLE_AI_KEY is not configured");

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

    const systemPrompt = `Ти си експерт бизнес планировчик. Създай детайлен седмичен план за ${weeksToGenerate} седмици, започващ от седмица ${currentWeek}.

БИЗНЕС КОНТЕКСТ:
- Тип бизнес: ${ctx.business_type || bp.industry || 'Не е посочен'}
- Целева аудитория: ${ctx.target_audience || 'Не е посочена'}
- Уебсайт: ${ctx.website || 'Няма'}
- Екип: ${ctx.team_size || 'Не е посочен'}
- Налични часове на ден: ${ctx.hours_per_day || '4-6 часа'}
- Предпочитани работни часове: ${ctx.preferred_work_hours || 'сутрин'}
- Маркетинг канали: ${ctx.marketing_channels || 'Не са посочени'}
- Продажбени канали: ${ctx.sales_channels || 'Не са посочени'}
- Седмични дейности: ${ctx.weekly_activities || 'Не са посочени'}
- Цели за месец 1: ${ctx.monthly_goals_1 || 'Не са посочени'}
- Позициониране: ${ctx.positioning || 'Не е посочено'}
- Основно послание: ${ctx.main_message || 'Не е посочено'}
- Lead механизъм: ${ctx.lead_mechanism || 'Не е посочен'}
- Рекламен бюджет: ${ctx.weekly_ad_budget || ctx.marketing_budget || 'Не е посочен'}
- Приоритети: ${ctx.priorities || 'Не са посочени'}
${planSummary ? `\nМАРКЕТИНГ ПЛАН (генерирано съдържание):${planSummary}` : ""}
${methodologyInsights ? `\nИНСАЙТИ ОТ МЕТОДОЛОГИЯТА:${methodologyInsights}` : ""}

КРИТИЧНО ВАЖНО - МАРКИРАНЕ НА ЗАДАЧИ:
Всяка задача ТРЯБВА да има поле "needsHuman": true или false.
- needsHuman: true → задачи които ИЗИСКВАТ човешко действие (снимане, физическа среща, телефонно обаждане, подписване, доставка, лични продажби, дизайн на физически материали, посещение на място)
- needsHuman: false → задачи които AI бот може да свърши (писане на постове, имейли, копирайтинг, анализ на данни, създаване на съдържание, SEO оптимизация, генериране на рекламни текстове)

ПРАВИЛА ЗА ПЛАНИРАНЕ:
1. Разпредели задачите само в работни дни (понеделник-петък, dayOfWeek 1-5)
2. Не надвишавай ${ctx.hours_per_day || '6'} часа работа на ден
3. Високоприоритетните задачи в началото на седмицата
4. Всяка седмица да включва микс от маркетинг, съдържание, продажби
5. За needsHuman задачите — постави ги в удобни часове за срещи/обаждания
6. Давай реалистични timeSlot-ове (напр. "09:00-11:00")

Отговори САМО с валиден JSON масив:
[
  {
    "title": "Създаване на Instagram Reels",
    "description": "Заснемане на 3 кратки видеа за Instagram",
    "priority": "high",
    "estimatedHours": 2,
    "dayOfWeek": 1,
    "weekNumber": ${currentWeek},
    "timeSlot": "09:00-11:00",
    "taskType": "content",
    "channel": "Instagram",
    "needsHuman": true
  }
]

Генерирай 15-25 задачи за всяка седмица.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GOOGLE_AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Генерирай детайлен седмичен план за ${weeksToGenerate} седмици, започващ от седмица ${currentWeek}, ${now.getFullYear()} година.` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Прекалено много заявки. Моля, изчакайте малко." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in response");

    let tasks: ScheduleTask[];
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      tasks = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    // Group tasks by week
    const tasksByWeek: Record<number, ScheduleTask[]> = {};
    let humanTaskCount = 0;
    let botTaskCount = 0;
    tasks.forEach(task => {
      if (!tasksByWeek[task.weekNumber]) tasksByWeek[task.weekNumber] = [];
      tasksByWeek[task.weekNumber].push(task);
      if (task.needsHuman) humanTaskCount++; else botTaskCount++;
    });

    return new Response(JSON.stringify({
      tasks,
      tasksByWeek,
      startWeek: currentWeek,
      weeksGenerated: weeksToGenerate,
      humanTaskCount,
      botTaskCount,
      businessContext: {
        hoursPerDay: ctx.hours_per_day,
        preferredHours: ctx.preferred_work_hours,
        channels: ctx.marketing_channels,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
