import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isAssistant = role === "assistant";

  return (
    <div className={cn(
      "flex gap-3 animate-slide-up",
      isAssistant ? "flex-row" : "flex-row-reverse"
    )}>
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        isAssistant ? "gradient-primary" : "bg-secondary"
      )}>
        {isAssistant ? (
          <Bot className="h-5 w-5 text-primary-foreground" />
        ) : (
          <User className="h-5 w-5 text-secondary-foreground" />
        )}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isAssistant 
          ? "bg-secondary text-secondary-foreground rounded-tl-sm" 
          : "gradient-primary text-primary-foreground rounded-tr-sm"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
