import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GoalsEditChatProps {
  goals: Goal[];
  onGoalsUpdate: (goals: Goal[]) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-goals-chat`;

export function GoalsEditChat({ goals, onGoalsUpdate }: GoalsEditChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-start AI analysis when component mounts
  useEffect(() => {
    if (!hasInitialized && goals.length > 0) {
      setHasInitialized(true);
      autoAnalyzeGoals();
    }
  }, [goals, hasInitialized]);

  const autoAnalyzeGoals = async () => {
    setIsLoading(true);
    
    const analysisRequest: Message = { 
      role: "user", 
      content: "Анализирай целите и предложи подобрения. Направи ги SMART - конкретни, измерими, постижими, релевантни и с времеви рамки." 
    };
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [analysisRequest].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          goals,
        }),
      });

      if (!resp.ok) {
        throw new Error("Failed to analyze");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      setMessages([{ role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages([{ role: "assistant", content: assistantContent }]);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check for goal changes
      const changes = parseGoalChanges(assistantContent);
      if (changes) {
        applyChanges(changes);
      }
    } catch (error) {
      console.error("Auto-analysis error:", error);
      setMessages([{
        role: "assistant",
        content: `Здравейте! Виждам, че имате **${goals.length} годишни цели**. Мога да ви помогна да ги подобрите - направете ги по-конкретни, измерими и постижими. Какво бихте искали да променим?`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseGoalChanges = (content: string) => {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const changes = JSON.parse(jsonMatch[1]);
        return changes;
      } catch {
        return null;
      }
    }
    return null;
  };

  const applyChanges = (changes: any) => {
    if (!changes) return;

    const newGoals = [...goals];

    if (changes.action === "edit" && typeof changes.goalIndex === "number") {
      const goal = newGoals[changes.goalIndex];
      if (goal && changes.changes) {
        newGoals[changes.goalIndex] = {
          ...goal,
          ...changes.changes,
        };
        onGoalsUpdate(newGoals);
        toast.success(`Цел "${goal.title}" е обновена`);
      }
    } else if (changes.action === "add" && changes.changes) {
      const newGoal: Goal = {
        id: `goal-${Date.now()}`,
        title: changes.changes.title || "Нова цел",
        description: changes.changes.description || "",
        category: changes.changes.category || "other",
        priority: changes.changes.priority || "medium",
      };
      newGoals.push(newGoal);
      onGoalsUpdate(newGoals);
      toast.success(`Добавена нова цел: "${newGoal.title}"`);
    } else if (changes.action === "delete" && typeof changes.goalIndex === "number") {
      const goal = newGoals[changes.goalIndex];
      if (goal) {
        newGoals.splice(changes.goalIndex, 1);
        onGoalsUpdate(newGoals);
        toast.success(`Цел "${goal.title}" е изтрита`);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          goals,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Прекалено много заявки. Моля, изчакайте малко.");
          setIsLoading(false);
          return;
        }
        if (resp.status === 402) {
          toast.error("Нужно е добавяне на кредити за AI.");
          setIsLoading(false);
          return;
        }
        throw new Error("Failed to start stream");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      // Add placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check for goal changes in the response
      const changes = parseGoalChanges(assistantContent);
      if (changes) {
        applyChanges(changes);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Грешка при комуникация с AI");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        AI Консултант за редактиране на цели
      </div>

      <ScrollArea className="flex-1 min-h-0 max-h-[200px] pr-2" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl px-3 py-2 text-sm max-w-[85%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>
              {message.role === "user" && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишете какво искате да промените..."
          className="rounded-xl text-sm"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="rounded-xl shrink-0"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
