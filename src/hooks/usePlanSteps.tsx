import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PlanStep {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  step_order: number;
  completed: boolean;
  assigned_bot_id: string | null;
  generated_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIBot {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  instructions: string;
  model: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const defaultSteps = [
  { title: "Резюме на бизнеса", description: "Кратко описание на бизнес идеята, мисията и визията" },
  { title: "Пазарен анализ", description: "Анализ на целевия пазар, клиенти и конкуренция" },
  { title: "Маркетинг стратегия", description: "Канали за достигане до клиентите и рекламни планове" },
  { title: "Оперативен план", description: "Ежедневни операции, доставчици и процеси" },
  { title: "Финансови прогнози", description: "Приходи, разходи, рентабилност и инвестиции" },
];

export function usePlanSteps(projectId: string | null) {
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [bots, setBots] = useState<AIBot[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!projectId || !user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch plan steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('plan_steps')
        .select('*')
        .eq('project_id', projectId)
        .order('step_order');

      if (stepsError) throw stepsError;

      // If no steps exist, create default ones
      if (!stepsData || stepsData.length === 0) {
        const newSteps = defaultSteps.map((step, index) => ({
          project_id: projectId,
          title: step.title,
          description: step.description,
          step_order: index + 1,
          completed: false,
        }));

        const { data: createdSteps, error: createError } = await supabase
          .from('plan_steps')
          .insert(newSteps)
          .select();

        if (createError) throw createError;
        setSteps(createdSteps || []);
      } else {
        setSteps(stepsData);
      }

      // Fetch AI bots
      const { data: botsData, error: botsError } = await supabase
        .from('ai_bots')
        .select('*')
        .eq('project_id', projectId);

      if (botsError) throw botsError;
      setBots(botsData || []);
    } catch (error) {
      console.error("Error fetching plan data:", error);
      toast.error("Грешка при зареждане на данните");
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStep = async (stepId: string, updates: Partial<PlanStep>) => {
    const { error } = await supabase
      .from('plan_steps')
      .update(updates)
      .eq('id', stepId);

    if (error) {
      toast.error("Грешка при обновяване на стъпката");
      return false;
    }

    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
    return true;
  };

  const toggleStepComplete = async (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    await updateStep(stepId, { completed: !step.completed });
  };

  const assignBotToStep = async (stepId: string, botId: string | null) => {
    await updateStep(stepId, { assigned_bot_id: botId });
  };

  const createBot = async (bot: Omit<AIBot, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('ai_bots')
      .insert(bot)
      .select()
      .single();

    if (error) {
      toast.error("Грешка при създаване на бота");
      return null;
    }

    setBots(prev => [...prev, data]);
    toast.success(`Бот "${data.name}" е създаден успешно`);
    return data;
  };

  const updateBot = async (botId: string, updates: Partial<AIBot>) => {
    const { error } = await supabase
      .from('ai_bots')
      .update(updates)
      .eq('id', botId);

    if (error) {
      toast.error("Грешка при обновяване на бота");
      return false;
    }

    setBots(prev => prev.map(b => b.id === botId ? { ...b, ...updates } : b));
    return true;
  };

  const deleteBot = async (botId: string) => {
    const { error } = await supabase
      .from('ai_bots')
      .delete()
      .eq('id', botId);

    if (error) {
      toast.error("Грешка при изтриване на бота");
      return false;
    }

    setBots(prev => prev.filter(b => b.id !== botId));
    // Unassign bot from any steps
    setSteps(prev => prev.map(s => s.assigned_bot_id === botId ? { ...s, assigned_bot_id: null } : s));
    toast.success("Ботът е изтрит");
    return true;
  };

  const generateContent = async (stepId: string, projectId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step || !step.assigned_bot_id) {
      toast.error("Моля, първо присвоете бот на тази стъпка");
      return null;
    }

    const bot = bots.find(b => b.id === step.assigned_bot_id);
    if (!bot) {
      toast.error("Ботът не е намерен");
      return null;
    }

    // Prepare all steps info for context sharing
    const allStepsInfo = steps.map(s => ({
      id: s.id,
      title: s.title,
      order: s.step_order,
      generated_content: s.generated_content,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('generate-plan-content', {
        body: {
          stepId: step.id,
          botId: bot.id,
          stepTitle: step.title,
          stepDescription: step.description || '',
          botInstructions: bot.instructions,
          botName: bot.name,
          model: bot.model,
          projectId: projectId,
          allSteps: allStepsInfo,
        }
      });

      if (error) throw error;

      // Update local state
      setSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, generated_content: data.content } : s
      ));

      toast.success(`${bot.name} генерира съдържанието успешно`);
      return data.content;
    } catch (error: any) {
      console.error("Error generating content:", error);
      if (error.message?.includes('429')) {
        toast.error("Прекалено много заявки. Моля, изчакайте малко.");
      } else if (error.message?.includes('402')) {
        toast.error("Нужно е добавяне на кредити.");
      } else {
        toast.error("Грешка при генериране на съдържание");
      }
      return null;
    }
  };

  const updateContent = (stepId: string, content: string) => {
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, generated_content: content } : s
    ));
  };

  return {
    steps,
    bots,
    loading,
    updateStep,
    toggleStepComplete,
    updateContent,
    assignBotToStep,
    createBot,
    updateBot,
    deleteBot,
    generateContent,
    refetch: fetchData,
  };
}
