import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn(
      "flex animate-fade-in",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[75%] px-4 py-2.5 text-[15px] leading-relaxed",
        isUser 
          ? "bg-primary text-primary-foreground rounded-[20px] rounded-br-[4px]" 
          : "bg-secondary text-secondary-foreground rounded-[20px] rounded-bl-[4px]"
      )}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
