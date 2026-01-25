import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
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

// SVG Icons as components
const MicIcon = ({
  className
}: {
  className?: string;
}) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>;
const StopIcon = ({
  className
}: {
  className?: string;
}) => <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>;
const SendIcon = ({
  className
}: {
  className?: string;
}) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>;
export function ChatInterface({
  suggestions = []
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
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
  const handleSuggestionClick = (prompt: string) => {
    handleSend(prompt);
  };
  const startListening = useCallback(() => {
    // Check for Speech Recognition support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      alert('Вашият браузър не поддържа гласово разпознаване. Моля, използвайте Chrome или Safari.');
      return;
    }
    
    // Request microphone permission first
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        const recognition = new SpeechRecognitionAPI();
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
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event);
          setIsListening(false);
          setInterimTranscript("");
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognition.start();
      })
      .catch((err) => {
        console.error('Microphone permission denied:', err);
        alert('Моля, разрешете достъп до микрофона за да използвате гласово въвеждане.');
      });
  }, []);
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);
  const displayValue = input + (interimTranscript ? (input ? " " : "") + interimTranscript : "");
  const canSend = input.trim().length > 0 || interimTranscript.length > 0;
  return <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {messages.map(message => <ChatMessage key={message.id} {...message} />)}
          {isTyping && <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Compact ChatGPT style */}
      <div className="shrink-0 pb-3 px-3">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-2 transition-colors focus-within:border-primary/50 focus-within:bg-secondary/50">
            {/* Voice Button */}
            <button 
              onClick={isListening ? stopListening : startListening} 
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
                isListening 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {isListening ? <StopIcon className="h-3 w-3" /> : <MicIcon className="h-4 w-4" />}
            </button>

            {/* Text Input */}
            <input 
              type="text"
              value={displayValue} 
              onChange={e => {
                if (!isListening) {
                  setInput(e.target.value);
                }
              }} 
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isListening) stopListening();
                  handleSend(displayValue);
                }
              }} 
              placeholder={isListening ? "Слушам..." : "Напишете съобщение..."} 
              className={cn(
                "flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none",
                isListening && "text-foreground/80"
              )} 
            />
            
            {/* Recording indicator */}
            {isListening && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
              </span>
            )}

            {/* Send Button */}
            <button 
              onClick={() => {
                if (isListening) stopListening();
                handleSend(displayValue);
              }} 
              disabled={!canSend} 
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
                canSend 
                  ? "bg-foreground text-background hover:bg-foreground/90" 
                  : "text-muted-foreground/30"
              )}
            >
              <SendIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/50 mt-1.5">
            Симора може да прави грешки. Проверявайте важната информация.
          </p>
        </div>
      </div>
    </div>;
}