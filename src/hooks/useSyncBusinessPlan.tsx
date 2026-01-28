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
        q1_items: buildQuarterItems(stepsContent, 1),
        q2_items: buildQuarterItems(stepsContent, 2),
        q3_items: buildQuarterItems(stepsContent, 3),
        q4_items: buildQuarterItems(stepsContent, 4),
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

function buildQuarterItems(stepsContent: { title: string; content: string | null }[], quarter: number) {
  // Distribute content across quarters
  const itemsPerQuarter = Math.ceil(stepsContent.length / 4);
  const startIndex = (quarter - 1) * itemsPerQuarter;
  const quarterSteps = stepsContent.slice(startIndex, startIndex + itemsPerQuarter);

  return quarterSteps.map((step, index) => ({
    id: `q${quarter}-item-${Date.now()}-${index}`,
    type: "strategy",
    title: step.title,
    description: step.content?.substring(0, 1000) || "",
    owner: "",
    deadline: "",
    expectedResults: extractKeyPoints(step.content || ""),
    status: "planned",
    priority: index === 0 ? "high" : "medium",
  }));
}

function extractKeyPoints(content: string): string {
  // Try to extract key points section from content
  const keyPointsMatch = content.match(/## Ключови точки.*?:([\s\S]*?)(?:##|$)/);
  if (keyPointsMatch) {
    return keyPointsMatch[1].trim().substring(0, 500);
  }
  
  // Fallback to first paragraph
  const firstParagraph = content.split("\n\n")[0];
  return firstParagraph?.substring(0, 300) || "";
}
