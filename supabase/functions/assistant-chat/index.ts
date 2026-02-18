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
  
  // Calculate ISO week number
  const startOfYear = new Date(bgTime.getFullYear(), 0, 1);
  const days = Math.floor((bgTime.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  // Calculate quarter
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

// Tools for the assistant
const assistantTools = [
  {
    type: "function",
    function: {
      name: "create_weekly_task",
      description: "Създай задача в седмичния план на бизнес плана. Използвай за добавяне на маркетинг задачи, кампании, имейли, социални мрежи и др.",
      parameters: {
        type: "object",
        properties: {
          week_number: {
            type: "number",
            description: "Номер на седмицата (1-52)"
          },
          title: {
            type: "string",
            description: "Заглавие на задачата"
          },
          description: {
            type: "string",
            description: "Описание с детайли - бюджет, таргет, канал и т.н."
          },
          day_of_week: {
            type: "number",
            description: "Ден от седмицата (1=Понеделник, 5=Петък). Може да е null за цялата седмица."
          },
          task_type: {
            type: "string",
            enum: ["project", "strategy", "action"],
            description: "Тип: project=проект, strategy=стратегия, action=действие"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Приоритет на задачата"
          },
          estimated_hours: {
            type: "number",
            description: "Очаквано време в часове"
          }
        },
        required: ["week_number", "title", "task_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_overdue_tasks",
      description: "Вземи списък с пропуснати/незавършени задачи от минали седмици",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_current_week_tasks",
      description: "Вземи задачите за текущата седмица",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectId, context = "business" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get date context
    const dateContext = getDateContext();
    console.log("Date context:", dateContext);

    // Get business plan for context
    let businessPlanContext = "";
    let businessPlanId = null;
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

      // Get marketing plan (plan_steps with generated content)
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

      // Get step answers for additional context
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

      // Get overdue tasks
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

      // Get current week tasks
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

    // Video context - different system prompt
    if (context === "video") {
      const videoSystemPrompt = `Ти си експерт по видео обработка с ffmpeg. Говориш на български език.

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

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: videoSystemPrompt },
            ...messages,
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI video error:", response.status, errorText);
        throw new Error(`AI video error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content || "Как мога да ви помогна с видеото?";
      
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Business context (original code)

📅 ТЕКУЩА ДАТА: ${dateContext.formatted}
📆 Седмица: ${dateContext.weekNumber} от 52
🗓️ Тримесечие: Q${dateContext.quarter}
📊 Година: ${dateContext.year}

${businessPlanContext}
${marketingPlanContext}

ТВОИТЕ ВЪЗМОЖНОСТИ:
1. Можеш да добавяш задачи директно в бизнес плана чрез create_weekly_task
2. Можеш да проверяваш пропуснати задачи с get_overdue_tasks
3. Можеш да показваш текущите задачи с get_current_week_tasks

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

    // Initial AI call
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: assistantTools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Твърде много заявки. Моля, изчакайте малко." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Нужно е допълване на кредити." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    
    if (!choice) {
      throw new Error("No response from AI");
    }

    // Handle tool calls
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults: any[] = [];
      
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        
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
          
          if (error) {
            console.error("Error creating task:", error);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify({ success: false, error: error.message })
            });
          } else {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify({ 
                success: true, 
                message: `Задачата "${args.title}" е добавена в седмица ${args.week_number}` 
              })
            });
          }
        } else if (functionName === "get_overdue_tasks" && businessPlanId) {
          const { data: overdue } = await supabase
            .from("weekly_tasks")
            .select("*")
            .eq("business_plan_id", businessPlanId)
            .lt("week_number", dateContext.weekNumber)
            .eq("is_completed", false);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({ tasks: overdue || [] })
          });
        } else if (functionName === "get_current_week_tasks" && businessPlanId) {
          const { data: current } = await supabase
            .from("weekly_tasks")
            .select("*")
            .eq("business_plan_id", businessPlanId)
            .eq("week_number", dateContext.weekNumber);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: JSON.stringify({ tasks: current || [] })
          });
        }
      }

      // Second call with tool results
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          stream: false,
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error("Follow-up AI call failed");
      }

      const followUpData = await followUpResponse.json();
      const finalContent = followUpData.choices?.[0]?.message?.content || "Готово!";
      
      return new Response(JSON.stringify({ content: finalContent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No tool calls, return direct response
    const content = choice.message?.content || "Как мога да ви помогна?";
    
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Assistant chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Възникна грешка" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
