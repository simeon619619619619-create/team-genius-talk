import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface PlanStep {
  id: string;
  title: string;
  step_order: number;
  generated_content: string | null;
}

interface WeeklyStrategy {
  weekNumber: number;
  title: string;
  description: string;
  focus: string;
  tactics: string[];
}

export function useSyncBusinessPlan(projectId: string | null) {
  const navigate = useNavigate();

  const syncToBusinessPlan = useCallback(async (steps: PlanStep[]) => {
    console.log("syncToBusinessPlan called with projectId:", projectId, "steps:", steps);
    
    if (!projectId) {
      toast.error("Няма избран проект");
      return false;
    }

    try {
      // Collect all generated content from steps
      const stepsContent = steps
        .filter(s => s.generated_content)
        .sort((a, b) => a.step_order - b.step_order)
        .map(s => ({
          title: s.title,
          content: s.generated_content,
        }));

      console.log("Steps with content:", stepsContent);

      if (stepsContent.length === 0) {
        toast.error("Няма генерирано съдържание за синхронизиране");
        return false;
      }

      // Build annual goals from the content
      const annualGoals = stepsContent.map((step, index) => ({
        id: `goal-${Date.now()}-${index}`,
        title: step.title,
        description: step.content?.substring(0, 500) || "",
        category: getCategoryFromTitle(step.title),
        priority: index < 2 ? "high" : index < 4 ? "medium" : "low",
        status: "not_started",
      }));

      // Generate weekly strategies for each quarter (13 weeks per quarter)
      const allWeeklyStrategies = generateWeeklyStrategiesFromContent(stepsContent);

      // Check if business plan exists for this project
      const { data: existingPlan, error: fetchError } = await supabase
        .from("business_plans")
        .select("id")
        .eq("project_id", projectId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      const planData = {
        project_id: projectId,
        year: new Date().getFullYear(),
        annual_goals: annualGoals,
        q1_items: allWeeklyStrategies.q1,
        q2_items: allWeeklyStrategies.q2,
        q3_items: allWeeklyStrategies.q3,
        q4_items: allWeeklyStrategies.q4,
        updated_at: new Date().toISOString(),
      };

      if (existingPlan) {
        // Update existing business plan
        const { error: updateError } = await supabase
          .from("business_plans")
          .update(planData)
          .eq("id", existingPlan.id);

        if (updateError) throw updateError;
      } else {
        // Create new business plan
        const { error: insertError } = await supabase
          .from("business_plans")
          .insert(planData);

        if (insertError) throw insertError;
      }

      toast.success("Маркетинг планът е прехвърлен в Бизнес план!");
      
      // Navigate to business plan page
      navigate("/business-plan");
      return true;
    } catch (error) {
      console.error("Error syncing to business plan:", error);
      toast.error("Грешка при синхронизация с бизнес плана");
      return false;
    }
  }, [projectId, navigate]);

  return { syncToBusinessPlan };
}

function getCategoryFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("финанс")) return "revenue";
  if (titleLower.includes("пазар")) return "growth";
  if (titleLower.includes("маркетинг") || titleLower.includes("контент")) return "growth";
  if (titleLower.includes("оператив")) return "efficiency";
  if (titleLower.includes("резюме")) return "other";
  return "other";
}

// Weekly marketing themes that rotate throughout the year
const weeklyThemes = [
  { focus: "Брандинг и позициониране", tactics: ["Социални мрежи", "Съдържание", "PR"] },
  { focus: "Генериране на лийдове", tactics: ["Имейл маркетинг", "Реклами", "Уебинари"] },
  { focus: "Ангажираност на клиенти", tactics: ["Общност", "Събития", "Директна комуникация"] },
  { focus: "Продажби и конверсии", tactics: ["Оферти", "Промоции", "Ретаргетинг"] },
  { focus: "Съдържание и SEO", tactics: ["Блог", "Видео", "Оптимизация"] },
  { focus: "Партньорства", tactics: ["Колаборации", "Инфлуенсъри", "Афилиейт"] },
  { focus: "Анализ и оптимизация", tactics: ["A/B тестове", "Метрики", "Подобрения"] },
  { focus: "Изграждане на общност", tactics: ["Групи", "Форуми", "Клиентски събития"] },
  { focus: "Продуктов маркетинг", tactics: ["Лансиране", "Демо", "Кейс стъдита"] },
  { focus: "Retention маркетинг", tactics: ["Лоялност", "Upsell", "Cross-sell"] },
  { focus: "Awareness кампания", tactics: ["Платена реклама", "Органично съдържание", "PR"] },
  { focus: "Директни продажби", tactics: ["Outreach", "Мрежи", "Нетуъркинг"] },
  { focus: "Обратна връзка", tactics: ["Анкети", "Ревюта", "Клиентски интервюта"] },
];

function generateWeeklyStrategiesFromContent(stepsContent: { title: string; content: string | null }[]) {
  const result = {
    q1: [] as any[],
    q2: [] as any[],
    q3: [] as any[],
    q4: [] as any[],
  };

  // Extract key insights from each step's content
  const contentInsights = stepsContent.map(step => ({
    title: step.title,
    keyPoints: extractKeyInsights(step.content || ""),
    category: getCategoryFromTitle(step.title),
  }));

  // Generate 13 weeks for each quarter
  const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
  
  quarters.forEach((quarter, qIndex) => {
    const quarterStartWeek = qIndex * 13 + 1;
    
    for (let weekOffset = 0; weekOffset < 13; weekOffset++) {
      const weekNumber = quarterStartWeek + weekOffset;
      const themeIndex = weekOffset % weeklyThemes.length;
      const theme = weeklyThemes[themeIndex];
      
      // Rotate through content insights
      const insightIndex = weekOffset % contentInsights.length;
      const insight = contentInsights[insightIndex];
      
      const weeklyItem = {
        id: `${quarter}-week-${weekNumber}-${Date.now()}`,
        type: "strategy",
        weekNumber: weekNumber,
        title: `Седмица ${weekNumber}: ${theme.focus}`,
        description: buildWeeklyDescription(theme, insight, weekNumber, quarter),
        owner: "",
        deadline: getWeekDeadline(weekNumber),
        expectedResults: `Изпълнение на ${theme.focus.toLowerCase()} чрез ${theme.tactics.join(", ")}`,
        status: "planned",
        priority: weekOffset < 4 ? "high" : weekOffset < 9 ? "medium" : "low",
        tactics: theme.tactics,
        focus: theme.focus,
      };
      
      result[quarter].push(weeklyItem);
    }
  });

  return result;
}

function extractKeyInsights(content: string): string[] {
  const insights: string[] = [];
  
  // Try to extract bullet points or numbered items
  const bulletMatches = content.match(/[-•*]\s*(.+)/g);
  if (bulletMatches) {
    bulletMatches.slice(0, 5).forEach(match => {
      insights.push(match.replace(/^[-•*]\s*/, "").trim());
    });
  }
  
  // Extract headings as insights
  const headingMatches = content.match(/#{1,3}\s*(.+)/g);
  if (headingMatches) {
    headingMatches.slice(0, 3).forEach(match => {
      insights.push(match.replace(/^#{1,3}\s*/, "").trim());
    });
  }
  
  // Fallback to first sentences
  if (insights.length === 0) {
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
    sentences.slice(0, 3).forEach(s => insights.push(s.trim()));
  }
  
  return insights;
}

function buildWeeklyDescription(
  theme: { focus: string; tactics: string[] },
  insight: { title: string; keyPoints: string[]; category: string },
  weekNumber: number,
  quarter: string
): string {
  const quarterNames: Record<string, string> = {
    q1: "първо",
    q2: "второ", 
    q3: "трето",
    q4: "четвърто"
  };
  
  const keyPoint = insight.keyPoints[weekNumber % insight.keyPoints.length] || insight.title;
  
  return `**${quarterNames[quarter]} тримесечие, седмица ${weekNumber}**\n\n` +
    `Фокус: ${theme.focus}\n` +
    `Базирано на: ${insight.title}\n\n` +
    `Основни тактики за седмицата:\n` +
    theme.tactics.map(t => `• ${t}`).join("\n") +
    `\n\nКонтекст от плана: ${keyPoint.substring(0, 200)}`;
}

function getWeekDeadline(weekNumber: number): string {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = (weekNumber - 1) * 7 + 5; // Friday of that week
  const deadline = new Date(startOfYear.getTime() + dayOfYear * 24 * 60 * 60 * 1000);
  return deadline.toISOString().split('T')[0];
}
