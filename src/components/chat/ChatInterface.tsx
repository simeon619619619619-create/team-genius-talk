import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Здравейте! Аз съм вашият AI асистент за бизнес планиране и маркетинг. Как мога да ви помогна днес?"
  }
];

const mockResponses: Record<string, string> = {
  default: "Благодаря за въпроса! Ще анализирам вашите нужди и ще ви предложа подходяща маркетинг стратегия. Какъв е вашият бизнес и целева аудитория?",
  маркетинг: "За ефективен маркетинг план препоръчвам:\n\n1. Анализ на пазара\n2. Целева аудитория\n3. Канали за достигане\n4. Бюджет\n5. KPI метрики\n\nИскате ли да навлезем в детайли?",
  план: "Отличен избор! За създаване на бизнес план ще ви трябва:\n\n• Резюме на бизнеса\n• Пазарен анализ\n• Маркетинг стратегия\n• Финансови прогнози\n• Оперативен план\n\nС кой раздел искате да започнем?",
  екип: "За управление на екипа препоръчвам да:\n\n1. Дефинирате ясни роли\n2. Поставите измерими цели\n3. Провеждате седмични срещи\n4. Използвате инструменти за комуникация\n\nОтидете в раздел 'Екипи' за да организирате вашия екип!",
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input, interimTranscript]);

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
    setInterimTranscript("");
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

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Вашият браузър не поддържа гласово разпознаване.');
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionConstructor();
    recognitionRef.current = recognition;
    
    recognition.lang = 'bg-BG';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        setInput(prev => prev + final);
        setInterimTranscript(interim);
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const displayValue = input + (interimTranscript ? (input ? " " : "") + interimTranscript : "");
  const canSend = input.trim().length > 0 || interimTranscript.length > 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages.map((message) => (
            <ChatMessage key={message.id} {...message} />
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-[20px] rounded-bl-[4px] px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-end gap-2">
            {/* Voice Button */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
                isListening 
                  ? "bg-destructive text-destructive-foreground" 
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {isListening ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            {/* Text Input */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={displayValue}
                onChange={(e) => {
                  if (!isListening) {
                    setInput(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (isListening) stopListening();
                    handleSend(displayValue);
                  }
                }}
                placeholder={isListening ? "Слушам..." : "Съобщение"}
                rows={1}
                className={cn(
                  "w-full resize-none rounded-[20px] border bg-secondary px-4 py-2.5 pr-12 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
                  isListening && "border-destructive/50 bg-destructive/5"
                )}
                style={{ maxHeight: "120px" }}
              />
              
              {/* Recording indicator */}
              {isListening && (
                <div className="absolute right-14 top-1/2 -translate-y-1/2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
                  </span>
                </div>
              )}
            </div>

            {/* Send Button */}
            <Button
              onClick={() => {
                if (isListening) stopListening();
                handleSend(displayValue);
              }}
              disabled={!canSend}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
