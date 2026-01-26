import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalBot {
  id: string;
  step_key: string;
  name: string;
  description: string | null;
  instructions: string;
  model: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Map step titles to step_keys
const stepTitleToKey: Record<string, string> = {
  "Резюме на бизнеса": "business_summary",
  "Пазарен анализ": "market_analysis",
  "Маркетинг стратегия": "marketing_strategy",
  "Контент стратегия": "content_strategy",
  "Оперативен план": "operational_plan",
  "Финансови прогнози": "financial_projections",
};

export function useGlobalBots() {
  const [globalBots, setGlobalBots] = useState<GlobalBot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGlobalBots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('global_bots')
        .select('*');

      if (error) throw error;
      setGlobalBots(data || []);
    } catch (error) {
      console.error("Error fetching global bots:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalBots();
  }, [fetchGlobalBots]);

  const getBotForStep = useCallback((stepTitle: string): GlobalBot | null => {
    const stepKey = stepTitleToKey[stepTitle];
    if (!stepKey) return null;
    return globalBots.find(bot => bot.step_key === stepKey) || null;
  }, [globalBots]);

  return {
    globalBots,
    loading,
    getBotForStep,
    refetch: fetchGlobalBots,
  };
}
