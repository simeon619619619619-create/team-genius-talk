import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, Sparkles, PenLine, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getQuestionsForStep } from "@/data/stepQuestions";
import { cn } from "@/lib/utils";
import type { PlanStep, AIBot } from "@/hooks/usePlanSteps";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface StepChatInterfaceProps {
  step: PlanStep;
  projectId: string;
  bot: AIBot | null;
  onContentUpdate: (content: string) => void;
}

export function StepChatInterface({ step, projectId, bot, onContentUpdate }: StepChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'chat' | 'manual'>('chat');
  const [manualContent, setManualContent] = useState(step.generated_content || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stepQuestions = getQuestionsForStep(step.title);
  const questions = stepQuestions?.questions || [];

  // Load existing conversation and answers
  useEffect(() => {
    loadConversation();
    loadAnswers();
  }, [step.id]);

  useEffect(() => {
    setManualContent(step.generated_content || "");
  }, [step.generated_content]);

  const loadConversation = async () => {
    const { data, error } = await supabase
      .from('step_conversations')
      .select('*')
      .eq('step_id', step.id)
      .order('created_at');

    if (!error && data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })));
      
      // If there are no messages, add greeting
      if (data.length === 0 && stepQuestions) {
        const greetingMessage = {
          id: 'greeting',
          role: 'assistant' as const,
          content: `${stepQuestions.greeting}\n\n**${questions[0]?.question}**`,
        };
        setMessages([greetingMessage]);
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
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const { data, error } = await supabase.functions.invoke('step-chat', {
        body: {
          stepId: step.id,
          projectId,
          stepTitle: step.title,
          userMessage: userMessage.content,
          conversationHistory: messages.slice(-10),
          collectedAnswers,
          questionsToAsk: questions.map(q => ({ key: q.key, question: q.question })),
          currentQuestionIndex,
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
        <div className="border-b px-4 py-2 flex-shrink-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Чат с бот
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="h-4 w-4" />
              Пиша сам
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0">
          {/* Messages area - scrollable, takes remaining space */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {bot?.avatar_url ? (
                      <img src={bot.avatar_url} alt={bot.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-secondary rounded-2xl px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input - FIXED at bottom */}
          <div className="border-t p-3 bg-background flex-shrink-0">
            {Object.keys(collectedAnswers).length >= questions.length && (
              <Button
                onClick={handleGenerateFromAnswers}
                disabled={isGenerating}
                className="w-full gap-2 mb-2"
                variant="secondary"
                size="sm"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Генерирай съдържание от отговорите
              </Button>
            )}
            <div className="flex gap-2 items-center">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Напишете отговор..."
                className="min-h-[40px] max-h-[40px] resize-none py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-[40px] w-[40px] shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="flex-1 flex flex-col m-0 min-h-0">
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <Textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Напишете съдържанието за тази секция..."
              className="flex-1 resize-none min-h-[200px]"
            />
          </div>
          <div className="border-t p-3 flex-shrink-0">
            <Button onClick={handleSaveManual} className="w-full">
              Запази съдържанието
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
