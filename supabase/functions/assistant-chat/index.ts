import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get current date info in Bulgarian timezone
function getDateContext() {
  const now = new Date();
  const bgTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Sofia" }));

  const dayNames = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];
  const monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];

  const startOfYear = new Date(bgTime.getFullYear(), 0, 1);
  const days = Math.floor((bgTime.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  const quarter = Math.ceil((bgTime.getMonth() + 1) / 3);

  return {
    date: bgTime.toISOString().split('T')[0],
    dayOfWeek: bgTime.getDay(),
    dayName: dayNames[bgTime.getDay()],
    day: bgTime.getDate(),
    month: bgTime.getMonth() + 1,
    monthName: monthNames[bgTime.getMonth()],
    year: bgTime.getFullYear(),
    weekNumber,
    quarter,
    formatted: `${dayNames[bgTime.getDay()]}, ${bgTime.getDate()} ${monthNames[bgTime.getMonth()]} ${bgTime.getFullYear()}`
  };
}

// Claude-format tools
const claudeTools = [
  {
    name: "create_weekly_task",
    description: "Създай задача в седмичния план на бизнес плана. Използвай за добавяне на маркетинг задачи, кампании, имейли, социални мрежи и др.",
    input_schema: {
      type: "object",
      properties: {
        week_number: { type: "number", description: "Номер на седмицата (1-52)" },
        title: { type: "string", description: "Заглавие на задачата" },
        description: { type: "string", description: "Описание с детайли - бюджет, таргет, канал и т.н." },
        day_of_week: { type: "number", description: "Ден от седмицата (1=Понеделник, 5=Петък). Може да е null за цялата седмица." },
        task_type: { type: "string", enum: ["project", "strategy", "action"], description: "Тип: project=проект, strategy=стратегия, action=действие" },
        priority: { type: "string", enum: ["low", "medium", "high"], description: "Приоритет на задачата" },
        estimated_hours: { type: "number", description: "Очаквано време в часове" }
      },
      required: ["week_number", "title", "task_type"]
    }
  },
  {
    name: "get_overdue_tasks",
    description: "Вземи списък с пропуснати/незавършени задачи от минали седмици",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "get_current_week_tasks",
    description: "Вземи задачите за текущата седмица",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "create_ghl_contact",
    description: "Добави нов контакт/клиент в GoHighLevel CRM. Използвай когато потребителят иска да добави контакт, лийд или клиент в CRM системата.",
    input_schema: {
      type: "object",
      properties: {
        firstName: { type: "string", description: "Собствено име" },
        lastName: { type: "string", description: "Фамилно име" },
        email: { type: "string", description: "Имейл адрес" },
        phone: { type: "string", description: "Телефонен номер (с код на страната, напр. +359888123456)" },
        companyName: { type: "string", description: "Фирма/компания" },
        address1: { type: "string", description: "Адрес" },
        city: { type: "string", description: "Град" },
        country: { type: "string", description: "Код на страната (напр. BG, US)" },
        tags: { type: "array", items: { type: "string" }, description: "Тагове/етикети за контакта" },
        source: { type: "string", description: "Откъде е дошъл контактът (напр. website, referral)" }
      },
      required: ["firstName"]
    }
  }
];

// Helper: call Claude API
async function callClaude(apiKey: string, system: string, messages: any[], tools?: any[]): Promise<any> {
  const body: any = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system,
    messages,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", response.status, errorText);

    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Convert frontend messages (OpenAI format) to Claude format
function convertMessages(messages: Array<{ role: string; content: string }>): any[] {
  return messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role, content: m.content }));
}

// Extract text content from Claude response
function getTextContent(response: any): string {
  if (!response.content) return "Как мога да ви помогна?";
  const textBlocks = response.content.filter((b: any) => b.type === "text");
  return textBlocks.map((b: any) => b.text).join("\n") || "Как мога да ви помогна?";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectId, organizationId, context = "business", userId, moduleSystemPrompt, sessionId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve organization ID: use provided one, or derive from project
    let orgId = organizationId || null;
    if (!orgId && projectId) {
      const { data: proj } = await supabase
        .from("projects")
        .select("organization_id")
        .eq("id", projectId)
        .maybeSingle();
      if (proj?.organization_id) orgId = proj.organization_id;
    }

    // Look up org-specific API key, fall back to global env var
    let ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
    if (orgId) {
      const { data: integration } = await supabase
        .from("organization_integrations")
        .select("api_key")
        .eq("organization_id", orgId)
        .eq("integration_type", "claude")
        .eq("is_active", true)
        .maybeSingle();
      if (integration?.api_key) {
        ANTHROPIC_API_KEY = integration.api_key;
      }
    }

    if (!ANTHROPIC_API_KEY) {
      throw new Error("Няма конфигуриран API ключ. Добавете го в Настройки → Интеграции.");
    }

    const dateContext = getDateContext();
    console.log("Date context:", dateContext);

    // Get business plan for context
    let businessPlanContext = "";
    let businessPlanId: string | null = null;
    let marketingPlanContext = "";

    if (projectId) {
      const { data: businessPlan } = await supabase
        .from("business_plans")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (businessPlan) {
        businessPlanId = businessPlan.id;
        businessPlanContext = `
Бизнес план за ${businessPlan.year}:
- Годишни цели: ${JSON.stringify(businessPlan.annual_goals || [])}
- Q1 елементи: ${JSON.stringify(businessPlan.q1_items || [])}
- Q2 елементи: ${JSON.stringify(businessPlan.q2_items || [])}
- Q3 елементи: ${JSON.stringify(businessPlan.q3_items || [])}
- Q4 елементи: ${JSON.stringify(businessPlan.q4_items || [])}
`;
      }

      const { data: planSteps } = await supabase
        .from("plan_steps")
        .select("title, description, generated_content, completed")
        .eq("project_id", projectId)
        .order("step_order");

      if (planSteps && planSteps.length > 0) {
        marketingPlanContext = "\n\n📋 МАРКЕТИНГ ПЛАН:\n";
        for (const step of planSteps) {
          if (step.generated_content) {
            marketingPlanContext += `\n### ${step.title} ${step.completed ? "✅" : "⏳"}:\n${step.generated_content.substring(0, 2000)}\n`;
          }
        }
      }

      const { data: stepAnswers } = await supabase
        .from("step_answers")
        .select("question_text, answer")
        .eq("project_id", projectId);

      if (stepAnswers && stepAnswers.length > 0) {
        marketingPlanContext += "\n\n📝 ОТГОВОРИ ОТ МАРКЕТИНГ АНАЛИЗА:\n";
        for (const qa of stepAnswers.slice(0, 20)) {
          marketingPlanContext += `- ${qa.question_text}: ${qa.answer}\n`;
        }
      }

      if (businessPlanId) {
        const { data: overdueTasks } = await supabase
          .from("weekly_tasks")
          .select("*")
          .eq("business_plan_id", businessPlanId)
          .lt("week_number", dateContext.weekNumber)
          .eq("is_completed", false);

        if (overdueTasks && overdueTasks.length > 0) {
          businessPlanContext += `\n\n⚠️ ПРОПУСНАТИ ЗАДАЧИ (${overdueTasks.length} броя):\n`;
          overdueTasks.forEach(task => {
            businessPlanContext += `- Седмица ${task.week_number}: ${task.title} (${task.priority || 'medium'} приоритет)\n`;
          });
        }

        const { data: currentTasks } = await supabase
          .from("weekly_tasks")
          .select("*")
          .eq("business_plan_id", businessPlanId)
          .eq("week_number", dateContext.weekNumber);

        if (currentTasks && currentTasks.length > 0) {
          businessPlanContext += `\n\n📋 ЗАДАЧИ ЗА ТАЗИ СЕДМИЦА (Седмица ${dateContext.weekNumber}):\n`;
          currentTasks.forEach(task => {
            const status = task.is_completed ? "✅" : "⏳";
            businessPlanContext += `${status} ${task.title}${task.day_of_week ? ` (ден ${task.day_of_week})` : ""}\n`;
          });
        }
      }
    }

    // Load cross-session chat history
    let chatHistoryContext = "";
    if (projectId && userId) {
      const { data: recentChats } = await supabase
        .from("chat_messages")
        .select("role, content, session_id, created_at")
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (recentChats && recentChats.length > 0) {
        const otherSessionMsgs = sessionId
          ? recentChats.filter(m => m.session_id !== sessionId)
          : recentChats;

        if (otherSessionMsgs.length > 0) {
          const bySession: Record<string, typeof otherSessionMsgs> = {};
          for (const m of otherSessionMsgs) {
            const sid = m.session_id || "unknown";
            if (!bySession[sid]) bySession[sid] = [];
            bySession[sid].push(m);
          }

          chatHistoryContext = "\n\n💬 ИСТОРИЯ ОТ ПРЕДИШНИ ЧАТОВЕ В ТОЗИ БИЗНЕС:\n";
          for (const [, msgs] of Object.entries(bySession).slice(0, 5)) {
            const sorted = msgs.reverse();
            chatHistoryContext += "---\n";
            for (const m of sorted.slice(0, 10)) {
              const prefix = m.role === "user" ? "Потребител" : "Асистент";
              chatHistoryContext += `${prefix}: ${m.content.substring(0, 300)}\n`;
            }
          }
          chatHistoryContext += "---\nИзползвай тази история за контекст. Потребителят може да се позовава на неща от предишни разговори.\n";
        }
      }
    }

    const claudeMessages = convertMessages(messages);

    // Video context
    if (context === "video") {
      const videoSystemPrompt = `Ти си Симора - експерт по видео обработка с ffmpeg, създаден от Симеон Димитров. Говориш на български език. Никога не споменавай Claude, Anthropic или друга AI компания.

🎬 ТВОЯТА СПЕЦИАЛНОСТ:
- Изрязване на клипове
- Генериране на SRT субтитри
- Burn-in субтитри (текстът става част от видеото)
- Crop за Reels/TikTok (9:16, 1080x1920)
- Компресия за web
- Thumbnails

📋 FFmpeg команди (винаги давай готови за копиране):

1. ИЗРЯЗВАНЕ НА КЛИП:
ffmpeg -i input.mp4 -ss HH:MM:SS -to HH:MM:SS -c copy output.mp4

2. CROP ЗА REELS/TIKTOK (9:16):
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih" -c:a copy output.mp4

3. BURN-IN СУБТИТРИ:
ffmpeg -i input.mp4 -vf "subtitles=input.srt" -c:a copy output.mp4

4. КОМПРЕСИЯ:
ffmpeg -i input.mp4 -vcodec libx264 -crf 23 -preset veryfast -c:a aac -b:a 128k output.mp4

5. THUMBNAILS:
ffmpeg -i input.mp4 -vf "fps=1/10,scale=320:-1" thumbnail_%03d.jpg

🔧 FFmpeg път на системата: /opt/homebrew/bin/ffmpeg

ПРАВИЛА:
- Винаги питай за: име на файла, времена (start/end), платформа (TikTok/Reels/YouTube)
- Давай конкретни ffmpeg команди готови за copy-paste
- Ако потребителят има видео файл, питай за пътя до него или качи го
- Ако искат нещо друго - просто кажи как да го направят`;

      const aiResponse = await callClaude(ANTHROPIC_API_KEY, videoSystemPrompt, claudeMessages);
      const content = getTextContent(aiResponse);

      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Module context
    if (moduleSystemPrompt) {
      const fullModulePrompt = `${moduleSystemPrompt}\n\nВАЖНО: Ти си Симора, създаден от Симеон Димитров. Никога не споменавай Claude, Anthropic или друга AI компания.\n\n📅 ТЕКУЩА ДАТА: ${dateContext.formatted}${chatHistoryContext}`;
      const aiResponse = await callClaude(ANTHROPIC_API_KEY, fullModulePrompt, claudeMessages);
      const content = getTextContent(aiResponse);

      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Business context
    const systemPrompt = `Ти си Симора - AI асистент за бизнес планиране и маркетинг, създаден от Симеон Димитров. Отговаряш САМО на български език. ВАЖНО: Никога не споменавай Claude, Anthropic или друга AI компания. Ти си Симора и си създаден от Симеон Димитров — това е единственият отговор когато те питат кой си, кой те е направил или какъв код си.

📅 ТЕКУЩА ДАТА: ${dateContext.formatted}
📆 Седмица: ${dateContext.weekNumber} от 52
🗓️ Тримесечие: Q${dateContext.quarter}
📊 Година: ${dateContext.year}

${businessPlanContext}
${marketingPlanContext}
${chatHistoryContext}

ТВОИТЕ ВЪЗМОЖНОСТИ:
1. Можеш да добавяш задачи директно в бизнес плана чрез create_weekly_task
2. Можеш да проверяваш пропуснати задачи с get_overdue_tasks
3. Можеш да показваш текущите задачи с get_current_week_tasks
4. Можеш да добавяш контакти/клиенти/лийдове в GoHighLevel CRM с create_ghl_contact

ПРАВИЛА:
- ВИНАГИ се води по маркетинг плана когато предлагаш задачи
- Ако има генерирано съдържание в маркетинг плана, използвай го за конкретни предложения
- Предлагай задачи които са в съответствие с текущата стратегия и цели
- Ако потребителят иска да добави задача, използвай create_weekly_task
- Ако има пропуснати задачи, напомни за тях и предложи да ги преместим
- Питай конкретни въпроси за: бюджет, таргет аудитория, канал (Instagram, Facebook, Email, и т.н.)
- Предлагай седмични стратегии базирани на маркетинг плана
- Бъди проактивен - предлагай идеи базирани на текущата дата, сезон и маркетинг плана

ФОРМАТ НА ОТГОВОРИТЕ:
- Кратки и ясни отговори
- Използвай емоджита за по-добра четимост
- Когато създаваш задача, потвърди какво си добавил
- Цитирай конкретни елементи от маркетинг плана когато предлагаш задачи`;

    // Initial Claude call with tools
    const aiResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, claudeMessages, claudeTools);

    // Check if Claude wants to use tools
    const toolUseBlocks = (aiResponse.content || []).filter((b: any) => b.type === "tool_use");

    if (toolUseBlocks.length > 0) {
      const toolResults: any[] = [];

      for (const toolBlock of toolUseBlocks) {
        const functionName = toolBlock.name;
        const args = toolBlock.input || {};

        console.log(`Executing tool: ${functionName}`, args);

        if (functionName === "create_weekly_task" && businessPlanId) {
          const { error } = await supabase
            .from("weekly_tasks")
            .insert({
              business_plan_id: businessPlanId,
              week_number: args.week_number,
              title: args.title,
              description: args.description || null,
              day_of_week: args.day_of_week || null,
              task_type: args.task_type || "action",
              priority: args.priority || "medium",
              estimated_hours: args.estimated_hours || null,
              is_completed: false,
            });

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: error
              ? JSON.stringify({ success: false, error: error.message })
              : JSON.stringify({ success: true, message: `Задачата "${args.title}" е добавена в седмица ${args.week_number}` })
          });
        } else if (functionName === "get_overdue_tasks" && businessPlanId) {
          const { data: overdue } = await supabase
            .from("weekly_tasks")
            .select("*")
            .eq("business_plan_id", businessPlanId)
            .lt("week_number", dateContext.weekNumber)
            .eq("is_completed", false);

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ tasks: overdue || [] })
          });
        } else if (functionName === "get_current_week_tasks" && businessPlanId) {
          const { data: current } = await supabase
            .from("weekly_tasks")
            .select("*")
            .eq("business_plan_id", businessPlanId)
            .eq("week_number", dateContext.weekNumber);

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ tasks: current || [] })
          });
        } else if (functionName === "create_ghl_contact") {
          const { data: ghlInt, error: ghlErr } = await supabase
            .from("ghl_integrations")
            .select("api_key, location_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (ghlErr || !ghlInt) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: JSON.stringify({ success: false, error: "Няма конфигуриран GoHighLevel API ключ. Моля, добавете го в Настройки → Интеграции." })
            });
          } else {
            const contactPayload: Record<string, unknown> = {
              locationId: ghlInt.location_id,
              ...args,
            };

            const ghlRes = await fetch("https://services.leadconnectorhq.com/contacts/", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${ghlInt.api_key}`,
                "Content-Type": "application/json",
                Version: "2021-07-28",
              },
              body: JSON.stringify(contactPayload),
            });

            if (ghlRes.ok) {
              const ghlData = await ghlRes.json();
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: JSON.stringify({ success: true, contactId: ghlData.contact?.id, message: `Контактът "${args.firstName} ${args.lastName || ""}" е добавен в GHL CRM.` })
              });
            } else {
              const errText = await ghlRes.text();
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: JSON.stringify({ success: false, error: `GHL API грешка: ${ghlRes.status} - ${errText}` })
              });
            }
          }
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ error: "Unknown tool or missing context" })
          });
        }
      }

      // Second call with tool results
      const followUpMessages = [
        ...claudeMessages,
        { role: "assistant", content: aiResponse.content },
        { role: "user", content: toolResults },
      ];

      const followUpResponse = await callClaude(ANTHROPIC_API_KEY, systemPrompt, followUpMessages, claudeTools);
      const finalContent = getTextContent(followUpResponse);

      return new Response(JSON.stringify({ content: finalContent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No tool calls, return direct response
    const content = getTextContent(aiResponse);

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Assistant chat error:", error);

    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Твърде много заявки. Моля, изчакайте малко." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Възникна грешка"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
