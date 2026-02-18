import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProject } from "./useCurrentProject";

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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const { projectId } = useCurrentProject();

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

  const [initialMessage] = useState<Message>(getInitialMessage);
  const [msgs, setMsgs] = useState<Message[]>([initialMessage]);

  // Sync internal state with the computed initial message
  useEffect(() => {
    setMsgs([getInitialMessage()]);
  }, [context]);

  const messages = context === "video" ? msgs : messages;
  const setMessages = context === "video" ? setMsgs : setMessages;

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
          context, // "business" or "video"
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
