import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCurrentProject } from "./useCurrentProject";

export interface ChatSession {
  id: string;
  title: string;
  chat_key: string;
  module_key?: string | null;
  module_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export function useChatSessions(chatKey: string) {
  const { user } = useAuth();
  const { projectId } = useCurrentProject();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset active session when chatKey changes (e.g., switching bots)
  useEffect(() => {
    setActiveSessionId(null);
  }, [chatKey]);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("chat_key", chatKey)
        .order("updated_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      } else {
        query = query.is("project_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setSessions(data);
        // Auto-select the most recent session if none active
        if (!activeSessionId) {
          setActiveSessionId(data[0].id);
        }
      } else {
        // Auto-create a first session so user always has one
        const { data: newSession, error: createErr } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: user.id,
            project_id: projectId || null,
            chat_key: chatKey,
            title: "Нов чат",
          })
          .select()
          .single();

        if (createErr) throw createErr;

        setSessions([newSession]);
        setActiveSessionId(newSession.id);
      }
    } catch (err) {
      console.error("Error fetching chat sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [user, projectId, chatKey, activeSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(async (title?: string, moduleKey?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          chat_key: chatKey,
          title: title || "Нов чат",
          module_key: moduleKey || null,
        })
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      setActiveSessionId(data.id);
      return data.id;
    } catch (err) {
      console.error("Error creating chat session:", err);
      return null;
    }
  }, [user, projectId, chatKey]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    try {
      await supabase
        .from("chat_sessions")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", sessionId);

      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, title } : s)
      );
    } catch (err) {
      console.error("Error updating session title:", err);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      // Messages will cascade-delete via FK
      await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId);

      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (activeSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Error deleting chat session:", err);
    }
  }, [activeSessionId, sessions]);

  const touchSession = useCallback(async (sessionId: string) => {
    try {
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);

      setSessions(prev => {
        const updated = prev.map(s =>
          s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s
        );
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
    } catch (err) {
      // non-critical
    }
  }, []);

  const markModuleCompleted = useCallback(async (sessionId: string, moduleLabel: string) => {
    try {
      await supabase
        .from("chat_sessions")
        .update({ module_completed: true, title: `${moduleLabel} ✅` })
        .eq("id", sessionId);

      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, module_completed: true, title: `${moduleLabel} ✅` } : s)
      );
    } catch (err) {
      console.error("Error marking module completed:", err);
    }
  }, []);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loading,
    createSession,
    updateSessionTitle,
    deleteSession,
    touchSession,
    markModuleCompleted,
    refetch: fetchSessions,
  };
}
