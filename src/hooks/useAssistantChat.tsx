import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProject } from "./useCurrentProject";
import { useAuth } from "./useAuth";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const defaultInitialMessage: Message = {
  id: "1",
  role: "assistant",
  content: "Здравейте! 👋 Аз съм Симора - вашият AI асистент за бизнес планиране. Мога да:\n\n📅 Добавям задачи в седмичния ви план\n⚠️ Напомням за пропуснати задачи\n💡 Предлагам маркетинг стратегии\n\nКак мога да ви помогна днес?"
};

const videoInitialMessage: Message = {
  id: "1",
  role: "assistant",
  content: "Здравейте! 👋 Аз съм вашият AI видео асистент. Мога да ви помогна с:\n\n🎬 Изрязване на клипове\n📝 Генериране на субтитри\n🔥 Burn-in субтитри\n📐 Crop за Reels/TikTok\n📦 Компресия\n🖼️ Thumbnails\n\nКажете ми какво искате да направите с видеото си — ще ви дам готова ffmpeg команда!"
};

export function useAssistantChat(
  context: "business" | "video" = "business",
  moduleSystemPrompt?: string,
  moduleInitialMessage?: string,
  sessionId?: string | null
) {
  const { projectId } = useCurrentProject();
  const { user } = useAuth();

  const chatKey = moduleSystemPrompt
    ? "module:" + moduleSystemPrompt.substring(0, 80)
    : context;

  const getInitialMsg = (): Message => {
    if (moduleInitialMessage) {
      return { id: "1", role: "assistant", content: moduleInitialMessage };
    }
    if (context === "video") return videoInitialMessage;
    return defaultInitialMessage;
  };

  const [messages, setMessages] = useState<Message[]>([getInitialMsg()]);
  const [isLoading, setIsLoading] = useState(false);
  const loadedRef = useRef(false);
  const lastSessionRef = useRef<string | null | undefined>(undefined);

  // Load messages when session changes
  useEffect(() => {
    if (!user) return;

    // Reset when session changes
    if (lastSessionRef.current !== sessionId) {
      lastSessionRef.current = sessionId;
      loadedRef.current = false;
      setMessages([getInitialMsg()]);
    }

    if (loadedRef.current) return;
    loadedRef.current = true;

    // If no session selected, show just the initial message
    if (!sessionId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("id, role, content, created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(200);

        if (error) {
          console.error("Error loading chat:", error);
          return;
        }

        if (data && data.length > 0) {
          setMessages(data.map(m => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
        }
      } catch (err) {
        console.error("Error loading chat:", err);
      }
    })();
  }, [user, sessionId]);

  const saveMessage = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!user || !sessionId) return;
    try {
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        project_id: projectId || null,
        chat_key: chatKey,
        session_id: sessionId,
        role,
        content,
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  }, [user, projectId, chatKey, sessionId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    saveMessage("user", content.trim());

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          messages: [...history, { role: "user", content: content.trim() }],
          projectId,
          context,
          userId: user?.id,
          sessionId: sessionId || undefined,
          moduleSystemPrompt: moduleSystemPrompt || undefined,
        },
      });

      if (error) throw error;

      const reply = data.content || data.error || "Възникна грешка. Моля, опитайте отново.";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
      };

      setMessages(prev => [...prev, assistantMessage]);
      saveMessage("assistant", reply);
    } catch (error) {
      console.error("Assistant chat error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "⚠️ Възникна грешка при връзката. Моля, опитайте отново.",
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, projectId, context, moduleSystemPrompt, user?.id, saveMessage]);

  const clearChat = useCallback(async () => {
    setMessages([getInitialMsg()]);

    if (user && sessionId) {
      try {
        await supabase
          .from("chat_messages")
          .delete()
          .eq("session_id", sessionId);
      } catch (err) {
        console.error("Error clearing chat:", err);
      }
    }
  }, [user, sessionId, moduleInitialMessage, context]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
  };
}
