import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Suggestion {
  icon: string;
  title: string;
  prompt: string;
}

interface ChatInterfaceProps {
  suggestions?: Suggestion[];
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

const initialMessages: Message[] = [{
  id: "1",
  role: "assistant",
  content: "Здравейте! Аз съм вашият AI асистент за бизнес планиране и маркетинг. Как мога да ви помогна днес?"
}];

const mockResponses: Record<string, string> = {
  default: "Благодаря за въпроса! Ще анализирам вашите нужди и ще ви предложа подходяща маркетинг стратегия. Какъв е вашият бизнес и целева аудитория?",
  маркетинг: "За ефективен маркетинг план препоръчвам:\n\n1. Анализ на пазара\n2. Целева аудитория\n3. Канали за достигане\n4. Бюджет\n5. KPI метрики\n\nИскате ли да навлезем в детайли?",
  план: "Отличен избор! За създаване на бизнес план ще ви трябва:\n\n• Резюме на бизнеса\n• Пазарен анализ\n• Маркетинг стратегия\n• Финансови прогнози\n• Оперативен план\n\nС кой раздел искате да започнем?",
  екип: "За управление на екипа препоръчвам да:\n\n1. Дефинирате ясни роли\n2. Поставите измерими цели\n3. Провеждате седмични срещи\n4. Използвате инструменти за комуникация\n\nОтидете в раздел 'Екипи' за да организирате вашия екип!"
};

export function ChatInterface({
  suggestions = []
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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
    setInterimTranscript("");
    setIsTyping(true);
    scrollToBottom();
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getResponse(messageText)
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      scrollToBottom();
    }, 1000);
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSend(prompt);
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
    <div className="flex flex-col h-full bg-background">
      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 items-start",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {message.role === 'assistant' && (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            {message.role === 'user' && (
              <div className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#0891b2] text-white">
                {message.content}
              </div>
            )}
            {message.role === 'assistant' && (
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-secondary/80">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
            {message.role === 'user' && (
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-secondary/80 rounded-2xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input - FIXED at bottom */}
      <div className="border-t p-3 bg-background flex-shrink-0">
        <div className="flex gap-2 items-center">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant="ghost"
            size="icon"
            className={cn(
              "h-[40px] w-[40px] shrink-0 rounded-full",
              isListening && "bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Textarea
            value={displayValue}
            onChange={(e) => {
              if (!isListening) {
                setInput(e.target.value);
              }
            }}
            placeholder={isListening ? "Слушам..." : "Напишете отговор..."}
            className="min-h-[40px] max-h-[40px] resize-none py-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isListening) stopListening();
                handleSend(displayValue);
              }
            }}
          />
          <Button
            onClick={() => {
              if (isListening) stopListening();
              handleSend(displayValue);
            }}
            disabled={!canSend}
            size="icon"
            className="h-[40px] w-[40px] shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}