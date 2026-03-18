import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "./useOrganizations";
import type { AiBot } from "@/components/teams/VirtualOffice";

// Map database row to AiBot interface
function rowToBot(row: any): AiBot {
  return {
    id: row.bot_id,
    name: row.name,
    role: row.role,
    process: row.process || "",
    frequency: row.frequency || "",
    automations: row.automations || [],
    tasks: row.tasks || [],
    taskGroups: row.task_groups || [],
    skills: row.skills || [],
    shirtColor: row.shirt_color || "#818cf8",
    hairColor: row.hair_color || "#4a2810",
    skinColor: row.skin_color || "#f5c6a0",
    locked: row.locked || false,
    state: "idle",
  };
}

// Map AiBot to database row fields
function botToRow(bot: AiBot, organizationId: string) {
  return {
    organization_id: organizationId,
    bot_id: bot.id,
    name: bot.name,
    role: bot.role,
    process: bot.process,
    frequency: bot.frequency,
    automations: bot.automations,
    tasks: bot.tasks,
    task_groups: bot.taskGroups || [],
    skills: bot.skills || [],
    shirt_color: bot.shirtColor,
    hair_color: bot.hairColor,
    skin_color: bot.skinColor,
    locked: bot.locked || false,
    updated_at: new Date().toISOString(),
  };
}

export function useOrganizationBots() {
  const { currentOrganization } = useOrganizations();
  const [bots, setBots] = useState<AiBot[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = currentOrganization?.id;

  // Load bots from database
  const loadBots = useCallback(async () => {
    if (!orgId) {
      setBots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("organization_bots")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading org bots:", error);
      setBots([]);
    } else {
      setBots((data || []).map(rowToBot));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  // Also sync to localStorage for components that still read from there (AssistantPage)
  useEffect(() => {
    if (bots.length > 0) {
      localStorage.setItem("simora_ai_bots", JSON.stringify(bots));
    }
  }, [bots]);

  // Save all bots (full replace)
  const saveBots = useCallback(async (newBots: AiBot[]) => {
    if (!orgId) return;
    setBots(newBots);
    localStorage.setItem("simora_ai_bots", JSON.stringify(newBots));

    // Upsert all bots
    const rows = newBots.map(b => botToRow(b, orgId));
    const { error } = await supabase
      .from("organization_bots")
      .upsert(rows, { onConflict: "organization_id,bot_id" });

    if (error) console.error("Error saving bots:", error);
  }, [orgId]);

  // Add a single bot
  const addBot = useCallback(async (bot: AiBot) => {
    if (!orgId) return;
    const newBots = [...bots, bot];
    setBots(newBots);
    localStorage.setItem("simora_ai_bots", JSON.stringify(newBots));

    const { error } = await supabase
      .from("organization_bots")
      .insert(botToRow(bot, orgId));

    if (error) console.error("Error adding bot:", error);
  }, [orgId, bots]);

  // Update a single bot
  const updateBot = useCallback(async (bot: AiBot) => {
    if (!orgId) return;
    const newBots = bots.map(b => b.id === bot.id ? bot : b);
    setBots(newBots);
    localStorage.setItem("simora_ai_bots", JSON.stringify(newBots));

    const { error } = await supabase
      .from("organization_bots")
      .update(botToRow(bot, orgId))
      .eq("organization_id", orgId)
      .eq("bot_id", bot.id);

    if (error) console.error("Error updating bot:", error);
  }, [orgId, bots]);

  // Remove a bot
  const removeBot = useCallback(async (botId: string) => {
    if (!orgId) return;
    const newBots = bots.filter(b => b.id !== botId);
    setBots(newBots);
    localStorage.setItem("simora_ai_bots", JSON.stringify(newBots));

    const { error } = await supabase
      .from("organization_bots")
      .delete()
      .eq("organization_id", orgId)
      .eq("bot_id", botId);

    if (error) console.error("Error removing bot:", error);
  }, [orgId, bots]);

  return { bots, loading, saveBots, addBot, updateBot, removeBot, loadBots };
}
