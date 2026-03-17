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
  },
  {
    name: "update_website_content",
    description: "Редактирай съдържание на уебсайта на потребителя — създай блог пост, обнови страница, промени SEO мета описания, редактирай продуктови описания. Поддържа WordPress и Shopify.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["create_post", "update_post", "update_page", "update_product", "update_meta"], description: "Тип действие" },
        title: { type: "string", description: "Заглавие на поста/страницата" },
        content: { type: "string", description: "HTML съдържание" },
        slug: { type: "string", description: "URL slug за намиране на страницата (напр. about-us)" },
        meta_title: { type: "string", description: "SEO мета заглавие" },
        meta_description: { type: "string", description: "SEO мета описание (до 160 символа)" },
        status: { type: "string", enum: ["draft", "publish"], description: "draft=чернова (по подразбиране), publish=публикувай" },
        resource_id: { type: "string", description: "ID на ресурса за update (ако е известен)" }
      },
      required: ["action", "content"]
    }
  }
];

// OpenAI-format tools (same functionality, different schema format)
const openaiTools = claudeTools.map(t => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }
}));

// Gemini-format tools
const geminiTools = [{
  function_declarations: claudeTools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }))
}];

// ── Provider: Claude ──
async function callClaude(apiKey: string, model: string, system: string, messages: any[], tools?: any[]): Promise<any> {
  const body: any = {
    model,
    max_tokens: 4096,
    system,
    messages,
  };
  if (tools && tools.length > 0) body.tools = tools;

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
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }
  return await response.json();
}

function getClaudeText(response: any): string {
  if (!response.content) return "Как мога да ви помогна?";
  const textBlocks = response.content.filter((b: any) => b.type === "text");
  return textBlocks.map((b: any) => b.text).join("\n") || "Как мога да ви помогна?";
}

function getClaudeToolCalls(response: any): any[] {
  return (response.content || []).filter((b: any) => b.type === "tool_use");
}

// ── Provider: OpenAI / ChatGPT ──
async function callOpenAI(apiKey: string, model: string, system: string, messages: any[], tools?: any[]): Promise<any> {
  const openaiMessages = [
    { role: "system", content: system },
    ...messages,
  ];

  const body: any = { model, messages: openaiMessages };
  if (tools && tools.length > 0) body.tools = tools;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }
  return await response.json();
}

function getOpenAIText(response: any): string {
  return response.choices?.[0]?.message?.content || "Как мога да ви помогна?";
}

function getOpenAIToolCalls(response: any): any[] {
  return response.choices?.[0]?.message?.tool_calls || [];
}

// ── Provider: Gemini ──
async function callGemini(apiKey: string, model: string, system: string, messages: any[], tools?: any[]): Promise<any> {
  const geminiContents = messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));

  const body: any = {
    contents: geminiContents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { maxOutputTokens: 4096 },
  };
  if (tools && tools.length > 0) body.tools = tools;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  return await response.json();
}

function getGeminiText(response: any): string {
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts.filter((p: any) => p.text).map((p: any) => p.text).join("\n") || "Как мога да ви помогна?";
}

function getGeminiToolCalls(response: any): any[] {
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts.filter((p: any) => p.functionCall);
}

// ── Unified AI call ──
interface AIConfig {
  provider: string; // "claude" | "openai" | "gemini"
  apiKey: string;
  model: string;
}

async function callAI(config: AIConfig, system: string, messages: any[], withTools: boolean): Promise<{ text: string; toolCalls: any[]; rawResponse: any }> {
  const { provider, apiKey, model } = config;

  if (provider === "openai") {
    const resp = await callOpenAI(apiKey, model, system, messages, withTools ? openaiTools : undefined);
    return { text: getOpenAIText(resp), toolCalls: getOpenAIToolCalls(resp), rawResponse: resp };
  }

  if (provider === "gemini") {
    const resp = await callGemini(apiKey, model, system, messages, withTools ? geminiTools : undefined);
    return { text: getGeminiText(resp), toolCalls: getGeminiToolCalls(resp), rawResponse: resp };
  }

  // Default: Claude
  const resp = await callClaude(apiKey, model, system, messages, withTools ? claudeTools : undefined);
  return { text: getClaudeText(resp), toolCalls: getClaudeToolCalls(resp), rawResponse: resp };
}

// Build follow-up messages with tool results per provider
function buildToolFollowUp(config: AIConfig, originalMessages: any[], rawResponse: any, toolResults: Array<{ name: string; id: string; result: string }>): any[] {
  if (config.provider === "openai") {
    const assistantMsg = rawResponse.choices[0].message;
    return [
      ...originalMessages,
      assistantMsg,
      ...toolResults.map(tr => ({
        role: "tool",
        tool_call_id: tr.id,
        content: tr.result,
      })),
    ];
  }

  if (config.provider === "gemini") {
    // Gemini uses functionResponse parts
    const modelParts = rawResponse.candidates[0].content.parts;
    return [
      ...originalMessages,
      { role: "model", parts: modelParts },
      {
        role: "user",
        parts: toolResults.map(tr => ({
          functionResponse: { name: tr.name, response: JSON.parse(tr.result) },
        })),
      },
    ];
  }

  // Claude
  return [
    ...originalMessages,
    { role: "assistant", content: rawResponse.content },
    {
      role: "user",
      content: toolResults.map(tr => ({
        type: "tool_result",
        tool_use_id: tr.id,
        content: tr.result,
      })),
    },
  ];
}

// Extract tool name and args from any provider's tool call
function parseToolCall(config: AIConfig, tc: any): { name: string; args: any; id: string } {
  if (config.provider === "openai") {
    return {
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || "{}"),
      id: tc.id,
    };
  }
  if (config.provider === "gemini") {
    return {
      name: tc.functionCall.name,
      args: tc.functionCall.args || {},
      id: tc.functionCall.name + "_" + Date.now(),
    };
  }
  // Claude
  return { name: tc.name, args: tc.input || {}, id: tc.id };
}

// Convert frontend messages to the format each provider expects
function convertMessages(messages: Array<{ role: string; content: string }>): any[] {
  return messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role, content: m.content }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectId, organizationId, context = "business", userId, moduleSystemPrompt, sessionId, extraContext } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve organization ID
    let orgId = organizationId || null;
    if (!orgId && projectId) {
      const { data: proj } = await supabase
        .from("projects")
        .select("organization_id")
        .eq("id", projectId)
        .maybeSingle();
      if (proj?.organization_id) orgId = proj.organization_id;
    }

    // Look up org-specific active AI integration
    let aiConfig: AIConfig = {
      provider: "claude",
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "",
      model: "claude-sonnet-4-20250514",
    };

    if (orgId) {
      const { data: integration } = await supabase
        .from("organization_integrations")
        .select("integration_type, api_key, model")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .in("integration_type", ["claude", "gemini", "openai"])
        .maybeSingle();

      if (integration?.api_key) {
        aiConfig = {
          provider: integration.integration_type,
          apiKey: integration.api_key,
          model: integration.model || aiConfig.model,
        };
      }
    }

    if (!aiConfig.apiKey) {
      throw new Error("Няма конфигуриран API ключ. Добавете го в Настройки → Интеграции.");
    }

    console.log(`Using AI provider: ${aiConfig.provider}, model: ${aiConfig.model}`);

    const dateContext = getDateContext();

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

    const convertedMessages = convertMessages(messages);

    // Video context
    if (context === "video") {
      let folderContext = "";
      if (extraContext) {
        folderContext = `\n\n📂 ФАЙЛОВЕ В ПАПКАТА НА ПОТРЕБИТЕЛЯ:
${extraContext}

ВАЖНО за работа с файлове:
- Виждаш реалните файлове от компютъра на потребителя
- Когато потребителят иска да направи видео (рийл, монтаж, клип), ТИ избираш кои файлове да се използват
- Предложи конкретен сценарий: кой файл за кой кадър, какъв текст, каква подредба
- Давай готови ffmpeg команди с реалните имена на файловете
- Ако потребителят каже идея, напиши скрипт и кажи кои файлове пасват на всяка част`;
      }

      const videoSystemPrompt = `Ти си Симора - видео продуцент и експерт по ffmpeg, създаден от Симеон Димитров. Говориш на български език. Никога не споменавай Claude, Anthropic, Google, OpenAI или друга AI компания.

🎬 КАКВО МОЖЕШ:
1. Създаваш сценарии за видео съдържание (Reels, TikTok, Stories)
2. Избираш кои файлове от папката пасват на всяка част от сценария
3. Генерираш готови ffmpeg команди за обработка
4. Правиш цветова корекция, crop, изрязване, субтитри, текст

🧠 РАБОТЕН ПРОЦЕС:
1. Потребителят дава идея за видео
2. Ти пишеш кратък сценарий (кадър по кадър)
3. Избираш файлове от папката за всеки кадър
4. Даваш ffmpeg команди готови за copy-paste

📋 ОСНОВНИ FFmpeg КОМАНДИ:

ИЗРЯЗВАНЕ: ffmpeg -i input.mp4 -ss HH:MM:SS -to HH:MM:SS -c copy output.mp4
CROP 9:16: ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih" -c:a copy output.mp4
СУБТИТРИ: ffmpeg -i input.mp4 -vf "subtitles=input.srt" -c:a copy output.mp4
КОМПРЕСИЯ: ffmpeg -i input.mp4 -vcodec libx264 -crf 23 -preset veryfast -c:a aac -b:a 128k output.mp4
THUMBNAILS: ffmpeg -i input.mp4 -vf "fps=1/10,scale=320:-1" thumbnail_%03d.jpg
ЦВЕТОВЕ: ffmpeg -i input.mp4 -vf "eq=brightness=0.1:contrast=1.3:saturation=1.4" -c:a copy output.mp4
ТЕКСТ: ffmpeg -i input.mp4 -vf "drawtext=text='TEXT':fontsize=48:fontcolor=white:x=(w-tw)/2:y=h-th-100" output.mp4
CONCAT: ffmpeg -f concat -safe 0 -i list.txt -c copy merged.mp4
СКОРОСТ: ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" fast.mp4

🔧 FFmpeg път: /opt/homebrew/bin/ffmpeg

ПРАВИЛА:
- Когато имаш достъп до файлове, ВИНАГИ ги използвай в командите с реалните им имена
- Бъди креативен при предлагане на сценарии — мисли като видео продуцент
- За Reels/TikTok: вертикално 9:16 (1080x1920), 15-60 секунди, бързи рязания
- Предлагай конкретни текстове за overlay на български${folderContext}`;

      const result = await callAI(aiConfig, videoSystemPrompt, convertedMessages, false);
      return new Response(JSON.stringify({ content: result.text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Module context
    if (moduleSystemPrompt) {
      const fullModulePrompt = `${moduleSystemPrompt}\n\nВАЖНО: Ти си Симора, създаден от Симеон Димитров. Никога не споменавай Claude, Anthropic, Google, OpenAI или друга AI компания.\n\n📅 ТЕКУЩА ДАТА: ${dateContext.formatted}${chatHistoryContext}`;
      const result = await callAI(aiConfig, fullModulePrompt, convertedMessages, false);
      return new Response(JSON.stringify({ content: result.text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Business context
    const systemPrompt = `Ти си Симора - AI асистент за бизнес планиране и маркетинг, създаден от Симеон Димитров. Отговаряш САМО на български език. ВАЖНО: Никога не споменавай Claude, Anthropic, Google, OpenAI, Gemini, ChatGPT или друга AI компания. Ти си Симора и си създаден от Симеон Димитров — това е единственият отговор когато те питат кой си, кой те е направил или какъв код си.

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

    // Initial AI call with tools
    const aiResult = await callAI(aiConfig, systemPrompt, convertedMessages, true);

    // Check if AI wants to use tools
    if (aiResult.toolCalls.length > 0) {
      const toolResults: Array<{ name: string; id: string; result: string }> = [];

      for (const tc of aiResult.toolCalls) {
        const { name: functionName, args, id: toolId } = parseToolCall(aiConfig, tc);
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
            name: functionName,
            id: toolId,
            result: error
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
            name: functionName,
            id: toolId,
            result: JSON.stringify({ tasks: overdue || [] })
          });
        } else if (functionName === "get_current_week_tasks" && businessPlanId) {
          const { data: current } = await supabase
            .from("weekly_tasks")
            .select("*")
            .eq("business_plan_id", businessPlanId)
            .eq("week_number", dateContext.weekNumber);

          toolResults.push({
            name: functionName,
            id: toolId,
            result: JSON.stringify({ tasks: current || [] })
          });
        } else if (functionName === "create_ghl_contact") {
          const { data: ghlInt, error: ghlErr } = await supabase
            .from("ghl_integrations")
            .select("api_key, location_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (ghlErr || !ghlInt) {
            toolResults.push({
              name: functionName,
              id: toolId,
              result: JSON.stringify({ success: false, error: "Няма конфигуриран GoHighLevel API ключ. Моля, добавете го в Настройки → Интеграции." })
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
                name: functionName,
                id: toolId,
                result: JSON.stringify({ success: true, contactId: ghlData.contact?.id, message: `Контактът "${args.firstName} ${args.lastName || ""}" е добавен в GHL CRM.` })
              });
            } else {
              const errText = await ghlRes.text();
              toolResults.push({
                name: functionName,
                id: toolId,
                result: JSON.stringify({ success: false, error: `GHL API грешка: ${ghlRes.status} - ${errText}` })
              });
            }
          }
        } else if (functionName === "update_website_content") {
          const { data: webInt } = await supabase
            .from("website_integrations")
            .select("*")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

          if (!webInt) {
            toolResults.push({ name: functionName, id: toolId,
              result: JSON.stringify({ success: false, error: "Няма свързан уебсайт. Потребителят трябва да добави сайта си в Настройки → Интеграции → Уебсайт интеграции." })
            });
          } else {
            try {
              let apiResult: any = { success: false, error: "Неподдържана платформа" };
              const baseUrl = (webInt as any).site_url.replace(/\/$/, "");
              const apiKey = (webInt as any).api_key;
              const apiUser = (webInt as any).api_username || "admin";

              if ((webInt as any).platform === "wordpress") {
                const wpHeaders: Record<string, string> = {
                  "Content-Type": "application/json",
                  "Authorization": `Basic ${btoa(apiUser + ":" + apiKey)}`,
                };

                if (args.action === "create_post") {
                  const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
                    method: "POST", headers: wpHeaders,
                    body: JSON.stringify({
                      title: args.title || "Нов пост",
                      content: args.content,
                      status: args.status || "draft",
                    }),
                  });
                  if (res.ok) {
                    const d = await res.json();
                    apiResult = { success: true, id: d.id, link: d.link, message: `Пост "${args.title}" е създаден като ${args.status || "чернова"}.` };
                  } else {
                    apiResult = { success: false, error: `WordPress грешка: ${res.status} ${await res.text()}` };
                  }
                } else if (args.action === "update_page" || args.action === "update_post") {
                  const endpoint = args.action === "update_page" ? "pages" : "posts";
                  let resourceId = args.resource_id;
                  if (!resourceId && args.slug) {
                    const search = await fetch(`${baseUrl}/wp-json/wp/v2/${endpoint}?slug=${args.slug}`, { headers: wpHeaders });
                    if (search.ok) {
                      const items = await search.json();
                      if (items.length > 0) resourceId = items[0].id;
                    }
                  }
                  if (!resourceId) {
                    apiResult = { success: false, error: "Не мога да намеря страницата. Дайте slug или ID." };
                  } else {
                    const body: any = { content: args.content };
                    if (args.title) body.title = args.title;
                    const res = await fetch(`${baseUrl}/wp-json/wp/v2/${endpoint}/${resourceId}`, {
                      method: "PUT", headers: wpHeaders, body: JSON.stringify(body),
                    });
                    apiResult = res.ok
                      ? { success: true, message: "Страницата е обновена успешно." }
                      : { success: false, error: `WordPress грешка: ${res.status}` };
                  }
                } else if (args.action === "update_meta") {
                  apiResult = { success: true, message: `Мета данни генерирани:\nTitle: ${args.meta_title}\nDescription: ${args.meta_description}\n\nЗа да ги приложите, инсталирайте Yoast SEO плъгин.` };
                }
              } else if ((webInt as any).platform === "shopify") {
                const shHeaders = { "Content-Type": "application/json", "X-Shopify-Access-Token": apiKey };
                if (args.action === "update_product" && args.resource_id) {
                  const res = await fetch(`${baseUrl}/admin/api/2024-01/products/${args.resource_id}.json`, {
                    method: "PUT", headers: shHeaders,
                    body: JSON.stringify({ product: { body_html: args.content, title: args.title } }),
                  });
                  apiResult = res.ok ? { success: true, message: "Продуктът е обновен." } : { success: false, error: `Shopify грешка: ${res.status}` };
                } else if (args.action === "create_post") {
                  apiResult = { success: false, error: "За Shopify блог постове, използвайте Shopify Admin." };
                }
              }

              toolResults.push({ name: functionName, id: toolId, result: JSON.stringify(apiResult) });
            } catch (e: any) {
              toolResults.push({ name: functionName, id: toolId,
                result: JSON.stringify({ success: false, error: `Грешка: ${e.message}` })
              });
            }
          }
        } else {
          toolResults.push({
            name: functionName,
            id: toolId,
            result: JSON.stringify({ error: "Unknown tool or missing context" })
          });
        }
      }

      // Second call with tool results
      const followUpMessages = buildToolFollowUp(aiConfig, convertedMessages, aiResult.rawResponse, toolResults);
      const followUpResult = await callAI(aiConfig, systemPrompt, followUpMessages, true);

      return new Response(JSON.stringify({ content: followUpResult.text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No tool calls, return direct response
    return new Response(JSON.stringify({ content: aiResult.text }), {
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
