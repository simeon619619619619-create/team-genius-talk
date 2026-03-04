import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProject } from "./useCurrentProject";
import { useAuth } from "./useAuth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const initialMessages: Message[] = [{
  id: "1",
  role: "assistant",
  content: "Здравейте! 👋 Аз съм Симора - вашият AI асистент за бизнес планиране. Мога да:\n\n📅 Добавям задачи в седмичния ви план\n⚠️ Напомням за пропуснати задачи\n💡 Предлагам маркетинг стратегии\n\nКак мога да ви помогна днес?"
}];

export function useAssistantChat(context: "business" | "video" = "business") {
  const [businessMessages, setBusinessMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const { projectId } = useCurrentProject();
  const { user } = useAuth();

  const getInitialMessage = () => {
    if (context === "video") {
      return {
        id: "1",
        role: "assistant" as const,
        content: "Здравейте! 👋 Аз съм вашият AI видео асистент. Мога да ви помогна с:\n\n🎬 Изрязване на клипове\n📝 Генериране на субтитри\n🔥 Burn-in субтитри\n📐 Crop за Reels/TikTok\n📦 Компресия\n🖼️ Thumbnails\n\nКажете ми какво искате да направите с видеото си — ще ви дам готова ffmpeg команда!"
      };
    }
    return initialMessages[0];
  };

  const [videoInitialMessage] = useState<Message>(getInitialMessage);
  const [videoMessages, setVideoMessages] = useState<Message[]>([videoInitialMessage]);

  // Sync internal state with the computed initial message
  useEffect(() => {
    if (context === "video") {
      setVideoMessages([getInitialMessage()]);
    }
  }, [context]);

  const messages = context === "video" ? videoMessages : businessMessages;
  const setMessages = context === "video" ? setVideoMessages : setBusinessMessages;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build message history for context (last 10 messages)
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
        },
      });

      if (error) {
        throw error;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || data.error || "Възникна грешка. Моля, опитайте отново.",
      };

      setMessages(prev => [...prev, assistantMessage]);
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
  }, [messages, projectId, context]);

  const clearChat = useCallback(() => {
    setMessages(initialMessages);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
  };
}
