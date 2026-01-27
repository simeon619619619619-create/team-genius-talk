import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Bot, User, Loader2, PenLine, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getQuestionsForStep } from "@/data/stepQuestions";
import { cn } from "@/lib/utils";
import type { PlanStep } from "@/hooks/usePlanSteps";
import type { GlobalBot } from "@/hooks/useGlobalBots";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { ChatFileUpload, ChatAttachmentDisplay, type ChatAttachment } from "./ChatFileUpload";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
}

interface StepChatInterfaceProps {
  step: PlanStep;
  projectId: string;
  bot: GlobalBot | null;
  onContentUpdate: (content: string) => void;
  onStepComplete?: () => void;
  onCompletionStatusChange?: (canComplete: boolean, missingFields: string[], totalFields?: number) => void;
  onGoToNextStep?: () => void;
  onCompleteAndGoNext?: () => void;
}

export function StepChatInterface({ step, projectId, bot, onContentUpdate, onStepComplete, onCompletionStatusChange, onGoToNextStep, onCompleteAndGoNext }: StepChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'chat' | 'manual'>('chat');
  const [manualContent, setManualContent] = useState(step.generated_content || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [stepComplete, setStepComplete] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastResultIndexRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stepQuestions = getQuestionsForStep(step.title);
  const questions = stepQuestions?.questions || [];
  const requiredFields = stepQuestions?.requiredFields || [];
  const exitCriteria = stepQuestions?.exitCriteria || "";
  const completionMessage = stepQuestions?.completionMessage || "";
  const contextKeys = stepQuestions?.contextKeys || [];
  const botRole = stepQuestions?.botRole || "AI Асистент";

  // Load existing conversation and answers - reset state when step changes
  useEffect(() => {
    // Reset state when switching steps
    setMessages([]);
    setCollectedAnswers({});
    setCurrentQuestionIndex(0);
    setMissingFields([]);
    setStepComplete(false);
    
    loadConversation();
    loadAnswers();
  }, [step.id]);

  useEffect(() => {
    setManualContent(step.generated_content || "");
  }, [step.generated_content]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Гласовото разпознаване не се поддържа от този браузър.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Няма достъп до микрофона. Разрешете микрофон от настройките на браузъра.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      lastResultIndexRef.current = 0;

      recognition.lang = "bg-BG";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
        if (e?.error !== "aborted") {
          toast.error("Проблем с гласовото разпознаване. Опитайте отново.");
        }
      };
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interim = "";
        
        // Only process results we haven't seen yet
        for (let i = lastResultIndexRef.current; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            lastResultIndexRef.current = i + 1;
          } else {
            interim += result[0].transcript;
          }
        }
        
        setInterimTranscript(interim);
        if (finalTranscript) {
          setInput((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        }
      };

      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition", e);
      setIsListening(false);
      toast.error("Не успях да стартирам гласовото разпознаване.");
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } finally {
      setIsListening(false);
      setInterimTranscript("");
      lastResultIndexRef.current = 0;
    }
  }, []);

  // Helper function to check if an answer is actually invalid/empty
  const isInvalidAnswer = useCallback((answer: string | undefined): boolean => {
    if (!answer || answer.trim().length === 0) return true;
    
    // Only consider answer invalid if the WHOLE answer is essentially "don't know"
    const trimmed = answer.trim().toLowerCase();
    const invalidPatterns = [
      /^не знам\.?$/,
      /^не съм решил\.?$/,
      /^не съм сигурен\.?$/,
      /^нямам идея\.?$/,
      /^не мога да кажа\.?$/
    ];
    
    return invalidPatterns.some(pattern => pattern.test(trimmed));
  }, []);

  // Check completion status when answers change and notify parent
  useEffect(() => {
    if (requiredFields.length > 0) {
      const missing = requiredFields.filter(field => isInvalidAnswer(collectedAnswers[field]));
      setMissingFields(missing);
      const canComplete = missing.length === 0;
      setStepComplete(canComplete);
      
      // Notify parent component about completion status with total fields count
      onCompletionStatusChange?.(canComplete, missing, requiredFields.length);
    }
  }, [collectedAnswers, requiredFields, onCompletionStatusChange, isInvalidAnswer]);

  const loadConversation = async () => {
    const { data, error } = await supabase
      .from('step_conversations')
      .select('*')
      .eq('step_id', step.id)
      .order('created_at');

    if (!error && data) {
      if (data.length > 0) {
        // Load existing conversation from database
        setMessages(data.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })));
        // Scroll to bottom after loading existing messages
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 150);
      } else if (stepQuestions) {
        // No messages yet - save greeting to database and set locally
        const greetingContent = stepQuestions.greeting;
        
        const { data: insertedData, error: insertError } = await supabase
          .from('step_conversations')
          .insert({
            step_id: step.id,
            project_id: projectId,
            role: 'assistant',
            content: greetingContent,
          })
          .select()
          .single();

        if (!insertError && insertedData) {
          setMessages([{
            id: insertedData.id,
            role: 'assistant' as const,
            content: greetingContent,
          }]);
        } else {
          // Fallback to local greeting if insert fails
          setMessages([{
            id: 'greeting',
            role: 'assistant' as const,
            content: greetingContent,
          }]);
        }
      }
    }
  };

  const loadAnswers = async () => {
    const { data, error } = await supabase
      .from('step_answers')
      .select('*')
      .eq('step_id', step.id);

    if (!error && data) {
      const answers: Record<string, string> = {};
      data.forEach(a => {
        answers[a.question_key] = a.answer;
      });
      setCollectedAnswers(answers);
      setCurrentQuestionIndex(Math.min(data.length, questions.length - 1));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;

    // Build message content including attachment info
    let messageContent = input.trim();
    if (pendingAttachments.length > 0) {
      const attachmentInfo = pendingAttachments.map(a => 
        a.type === 'image' ? `[Прикачена снимка: ${a.name}]` : `[Прикачен файл: ${a.name}]`
      ).join(' ');
      messageContent = messageContent 
        ? `${messageContent}\n\n${attachmentInfo}` 
        : attachmentInfo;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    scrollToBottom();

    try {
      const { data, error } = await supabase.functions.invoke('step-chat', {
        body: {
          stepId: step.id,
          projectId,
          stepTitle: step.title,
          userMessage: userMessage.content,
          conversationHistory: messages.slice(-15),
          collectedAnswers,
          questionsToAsk: questions.map(q => ({ 
            key: q.key, 
            question: q.question,
            required: q.required 
          })),
          currentQuestionIndex,
          botRole,
          requiredFields,
          exitCriteria,
          completionMessage,
          contextKeys,
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update collected answers
      if (questions[currentQuestionIndex]) {
        setCollectedAnswers(prev => ({
          ...prev,
          [questions[currentQuestionIndex].key]: userMessage.content,
        }));
      }

      if (data.nextQuestionIndex >= 0) {
        setCurrentQuestionIndex(data.nextQuestionIndex);
      }

      // Update missing fields and completion status
      if (data.missingFields) {
        const missing = Array.isArray(data.missingFields) ? data.missingFields : [];
        setMissingFields(missing);

        // Keep parent (PlanStepCard) in sync with server-side validation.
        // Otherwise the top "Завърши" button may stay disabled even when the bot says the step is complete.
        const canCompleteNow = missing.length === 0;
        setStepComplete(canCompleteNow);
        onCompletionStatusChange?.(canCompleteNow, missing, requiredFields.length);
      }
      
      if (data.canProceedToNext) {
        // Server confirmed the step can proceed; ensure UI reflects it immediately.
        setStepComplete(true);
        onCompletionStatusChange?.(true, [], requiredFields.length);
        toast.success("Стъпката е завършена! Можете да преминете към следващата.");
        onStepComplete?.();
      }

      scrollToBottom();
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Грешка при изпращане на съобщението');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFromAnswers = async () => {
    if (Object.keys(collectedAnswers).length === 0) {
      toast.error('Моля, първо отговорете на въпросите');
      return;
    }

    setIsGenerating(true);

    try {
      // Build answers context
      const answersContext = questions
        .filter(q => collectedAnswers[q.key])
        .map(q => `**${q.question}**\n${collectedAnswers[q.key]}`)
        .join('\n\n');

      const { data, error } = await supabase.functions.invoke('generate-from-answers', {
        body: {
          stepId: step.id,
          projectId,
          stepTitle: step.title,
          answersContext,
          botInstructions: bot?.instructions || '',
          botName: bot?.name || 'AI Асистент',
          model: bot?.model || 'google/gemini-3-flash-preview',
        }
      });

      if (error) throw error;

      onContentUpdate(data.content);
      setManualContent(data.content);
      toast.success('Съдържанието е генерирано успешно');
    } catch (error: any) {
      console.error('Generate error:', error);
      toast.error(error.message || 'Грешка при генериране');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveManual = async () => {
    try {
      const { error } = await supabase
        .from('plan_steps')
        .update({ generated_content: manualContent })
        .eq('id', step.id);

      if (error) throw error;
      
      onContentUpdate(manualContent);
      toast.success('Съдържанието е запазено');
    } catch (error) {
      toast.error('Грешка при запазване');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'chat' | 'manual')} className="flex flex-col h-full">
        <div className="border-b border-border/50 px-3 md:px-4 py-2 flex-shrink-0">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-secondary/50 p-1 h-9 md:h-10">
            <TabsTrigger 
              value="chat" 
              className="gap-1.5 md:gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 text-xs md:text-sm"
            >
              <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Чат с бот
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="gap-1.5 md:gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 text-xs md:text-sm"
            >
              <PenLine className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Пиша сам
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
          {/* Messages area - scrollable, takes remaining space */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-0">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 items-start animate-fade-in",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === 'assistant' && (
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 hover:scale-105">
                    {bot?.avatar_url ? (
                      <img src={bot.avatar_url} alt={bot.name} className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="max-w-[85%] flex flex-col items-end">
                    <div className="rounded-2xl px-4 py-2 text-sm font-medium bg-primary text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md">
                      {message.content.split('\n\n[Прикачен')[0]}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <ChatAttachmentDisplay attachments={message.attachments} />
                    )}
                  </div>
                )}
                {message.role === 'assistant' && (
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-secondary/60 shadow-sm prose prose-sm dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:text-foreground max-w-none transition-all duration-200 hover:bg-secondary/80">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="h-9 w-9 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 shadow-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-start animate-fade-in">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-secondary/60 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input - FIXED at bottom */}
          <div className="border-t border-border/50 p-3 bg-background/80 backdrop-blur-sm flex-shrink-0">
            {/* Show "Go to next step" button when step is complete */}
            {stepComplete && onCompleteAndGoNext && (
              <Button
                onClick={onCompleteAndGoNext}
                className="w-full gap-2 mb-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-success hover:bg-success/90 text-success-foreground"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Завърши и продължи
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            
            
            {/* Pending attachments preview */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {pendingAttachments.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "relative group rounded-xl overflow-hidden border border-border/50 bg-secondary/30",
                      file.type === 'image' ? "w-14 h-14" : "flex items-center gap-2 px-2 py-1.5"
                    )}
                  >
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs truncate max-w-[80px]">{file.name}</span>
                    )}
                    <button
                      onClick={() => setPendingAttachments(prev => prev.filter(f => f.id !== file.id))}
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2 md:gap-3 bg-secondary/40 hover:bg-secondary/60 rounded-2xl px-3 md:px-4 py-2 md:py-3 transition-all duration-200 border border-border/30 focus-within:border-primary/30">
              {/* File upload button */}
              <ChatFileUpload
                projectId={projectId}
                stepId={step.id}
                pendingFiles={pendingAttachments}
                onFilesSelected={(files) => setPendingAttachments(prev => [...prev, ...files])}
                onRemoveFile={(id) => setPendingAttachments(prev => prev.filter(f => f.id !== id))}
              />
              
              {/* Mic button with recording indicator */}
              <div className="relative">
                <button 
                  type="button" 
                  onClick={isListening ? stopListening : startListening}
                  className={cn(
                    "relative z-10 flex items-center justify-center h-8 w-8 rounded-full transition-all duration-200 touch-manipulation",
                    isListening
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                  aria-label={isListening ? "Спри запис" : "Започни запис"}
                >
                  {isListening ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                  )}
                </button>
                {/* Pulsing rings when recording */}
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                    <span className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse" />
                  </>
                )}
              </div>
              
              {/* Input field */}
              <div className="flex-1 relative min-w-0">
                <textarea
                  ref={textareaRef}
                  value={isListening ? `${input}${interimTranscript ? (input ? " " : "") + interimTranscript : ""}` : input}
                  onChange={(e) => {
                    if (!isListening) {
                      setInput(e.target.value);
                    }
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  placeholder={isListening ? "Слушам..." : "Напишете съобщение..."}
                  rows={1}
                  className={cn(
                    "w-full bg-transparent border-none outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground/60 resize-none scrollbar-thin overflow-y-auto transition-[height] duration-150 ease-out py-0.5",
                    isListening && "caret-transparent"
                  )}
                  style={{ minHeight: '24px', maxHeight: '200px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              </div>
              
              {/* Send button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && pendingAttachments.length === 0)}
                className={cn(
                  "p-2.5 md:p-2 rounded-full transition-all duration-200 touch-manipulation",
                  (input.trim() || pendingAttachments.length > 0)
                    ? "bg-primary text-primary-foreground shadow-sm active:scale-95" 
                    : "text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <Textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Напишете съдържанието за тази секция..."
              className="flex-1 resize-none min-h-[200px] rounded-2xl border-border/50 focus:border-primary/30 transition-all duration-200"
            />
          </div>
          <div className="border-t border-border/50 p-3 flex-shrink-0">
            <Button 
              onClick={handleSaveManual} 
              className="w-full rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Запази съдържанието
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
