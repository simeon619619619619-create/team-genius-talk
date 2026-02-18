import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { cn } from "@/lib/utils";
import { useAssistantChat } from "@/hooks/useAssistantChat";

interface Suggestion {
  icon: string;
  title: string;
  prompt: string;
}

interface ChatInterfaceProps {
  suggestions?: Suggestion[];
  context?: "business" | "video";
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

// SVG Icons as components
const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const StopIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const LoadingDots = () => (
  <div className="flex justify-start">
    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  </div>
);

export function ChatInterface({ suggestions = [], context = "business" }: ChatInterfaceProps) {
  const { messages, isLoading, sendMessage } = useAssistantChat(context);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    
    sendMessage(messageText);
    setInput("");
    setInterimTranscript("");
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSend(prompt);
  };

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      alert('Вашият браузър не поддържа гласово разпознаване. Моля, използвайте Chrome или Safari.');
      return;
    }
    
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
  const canSend = (input.trim().length > 0 || interimTranscript.length > 0) && !isLoading;

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {messages.map(message => (
            <ChatMessage key={message.id} {...message} />
          ))}
          {isLoading && <LoadingDots />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestions - show only when few messages */}
      {messages.length <= 2 && suggestions.length > 0 && (
        <div className="shrink-0 px-4 pb-2">
          <div className="mx-auto max-w-3xl flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.prompt)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/50 hover:bg-secondary text-sm transition-colors"
              >
                <span>{suggestion.icon}</span>
                <span>{suggestion.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 pb-3 px-3">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-2 transition-colors focus-within:border-primary/50 focus-within:bg-secondary/50">
            {/* Voice Button */}
            <button 
              onClick={isListening ? stopListening : startListening} 
              disabled={isLoading}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
                isListening 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                isLoading && "opacity-50 cursor-not-allowed"
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
              placeholder={isLoading ? "Изчакайте..." : isListening ? "Слушам..." : "Напишете съобщение..."} 
              disabled={isLoading}
              className={cn(
                "flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none",
                isListening && "text-foreground/80",
                isLoading && "opacity-50"
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
    </div>
  );
}
