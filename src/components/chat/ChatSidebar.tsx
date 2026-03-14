import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/hooks/useChatSessions";
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Днес";
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `Преди ${diffDays} дни`;
  return date.toLocaleDateString("bg-BG", { day: "numeric", month: "short" });
}

function groupSessions(sessions: ChatSession[]): { label: string; sessions: ChatSession[] }[] {
  const groups: Record<string, ChatSession[]> = {};

  for (const s of sessions) {
    const label = formatDate(s.updated_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }

  return Object.entries(groups).map(([label, sessions]) => ({ label, sessions }));
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const grouped = groupSessions(sessions);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-3 left-3 z-10 p-2 rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
        title="Покажи историята"
      >
        <PanelLeft className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className={cn(
      "w-64 border-r border-border bg-secondary/20 flex flex-col h-full shrink-0",
      "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:bg-background max-md:shadow-xl"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-sm font-medium px-2"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          Нов чат
        </Button>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Няма чатове все още
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                {group.label}
              </div>
              {group.sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  onMouseEnter={() => setHoveredId(session.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-left text-sm transition-colors group",
                    "hover:bg-secondary/80",
                    activeSessionId === session.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground"
                  )}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  <span className="truncate flex-1">{session.title}</span>
                  {hoveredId === session.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
