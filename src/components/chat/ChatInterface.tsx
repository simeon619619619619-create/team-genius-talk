import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { cn } from "@/lib/utils";
import { useAssistantChat } from "@/hooks/useAssistantChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";

interface PendingFile {
  id: string;
  name: string;
  file: File;
  preview?: string;
  type: 'image' | 'file';
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if ((!messageText && pendingFiles.length === 0) || isLoading || isUploading) return;
    
    if (pendingFiles.length > 0) {
      uploadAndSend(messageText || "");
    } else {
      sendMessage(messageText);
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} е твърде голям (макс. 100MB)`);
        continue;
      }
      const isImage = file.type.startsWith('image/');
      const pending: PendingFile = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: file.name,
        file,
        type: isImage ? 'image' : 'file',
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
      setPendingFiles(prev => [...prev, pending]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadAndSend = async (text: string) => {
    if (pendingFiles.length === 0) {
      sendMessage(text);
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Трябва да сте логнат");
        return;
      }

      const uploadedNames: string[] = [];
      for (const pf of pendingFiles) {
        const ext = pf.name.split('.').pop();
        const path = `${user.id}/assistant/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage.from('chat-attachments').upload(path, pf.file);
        if (error) {
          console.error('Upload error:', error);
          toast.error(`Грешка при качване на ${pf.name}`);
          continue;
        }
        uploadedNames.push(pf.name);
      }

      const filesList = uploadedNames.map(n => `📎 ${n}`).join('\n');
      const fullMessage = `${text}\n\n${filesList}`;
      sendMessage(fullMessage);

      // cleanup previews
      pendingFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      setPendingFiles([]);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Грешка при качване на файловете');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displayValue = input + (interimTranscript ? (input ? " " : "") + interimTranscript : "");
  const canSend = ((input.trim().length > 0 || interimTranscript.length > 0) || pendingFiles.length > 0) && !isLoading && !isUploading;

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
          {/* Pending files preview */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pb-2">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "relative group rounded-xl overflow-hidden border border-border/50 bg-secondary/30",
                    file.type === 'image' ? "w-16 h-16" : "flex items-center gap-2 px-3 py-2"
                  )}
                >
                  {file.type === 'image' && file.preview ? (
                    <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate max-w-[100px]">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(file.file.size)}</p>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => removePendingFile(file.id)}
                    className={cn(
                      "absolute bg-destructive text-destructive-foreground rounded-full p-0.5 transition-opacity",
                      file.type === 'image'
                        ? "top-1 right-1 opacity-0 group-hover:opacity-100"
                        : "-top-1 -right-1"
                    )}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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

            {/* Attach Button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all text-muted-foreground hover:text-foreground hover:bg-secondary",
                (isLoading || isUploading) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
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
              placeholder={isLoading ? "Изчакайте..." : isUploading ? "Качване..." : isListening ? "Слушам..." : "Напишете съобщение..."} 
              disabled={isLoading || isUploading}
              className={cn(
                "flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none",
                isListening && "text-foreground/80",
                (isLoading || isUploading) && "opacity-50"
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
