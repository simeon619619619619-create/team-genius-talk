import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { ChatMessage } from "./ChatMessage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Здравейте! Аз съм вашият AI асистент за бизнес планиране и маркетинг. Как мога да ви помогна днес? Можете да ми говорите директно или да пишете."
  }
];

const mockResponses: Record<string, string> = {
  default: "Благодаря за въпроса! Ще анализирам вашите нужди и ще ви предложа подходяща маркетинг стратегия. Какъв е вашият бизнес и целева аудитория?",
  маркетинг: "За ефективен маркетинг план препоръчвам:\n\n1. **Анализ на пазара** - проучете конкурентите\n2. **Целева аудитория** - дефинирайте вашите клиенти\n3. **Канали** - изберете социални мрежи, SEO, реклами\n4. **Бюджет** - разпределете ресурсите\n5. **KPI** - измервайте резултатите\n\nИскате ли да навлезем в детайли?",
  план: "Отличен избор! За създаване на бизнес план ще ви трябва:\n\n• Резюме на бизнеса\n• Пазарен анализ\n• Маркетинг стратегия\n• Финансови прогнози\n• Оперативен план\n\nС кой раздел искате да започнем?",
  екип: "За управление на екипа препоръчвам да:\n\n1. Дефинирате ясни роли\n2. Поставите измерими цели\n3. Провеждате седмични срещи\n4. Използвате инструменти за комуникация\n\nОтидете в раздел 'Екипи' за да организирате вашия екип!",
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getResponse = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("маркетинг")) return mockResponses.маркетинг;
    if (lowerText.includes("план")) return mockResponses.план;
    if (lowerText.includes("екип")) return mockResponses.екип;
    return mockResponses.default;
  };

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getResponse(messageText)
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleVoiceTranscript = (transcript: string) => {
    handleSend(transcript);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-primary-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-primary-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <VoiceButton onTranscript={handleVoiceTranscript} />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Напишете съобщение или говорете..."
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
