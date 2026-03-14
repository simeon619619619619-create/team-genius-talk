import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChevronDown, ArrowLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { useOverdueTasks } from "@/hooks/useOverdueTasks";
import { OverdueTasksSection } from "@/components/dashboard/OverdueTasksSection";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useChatSessions } from "@/hooks/useChatSessions";
import { MODULES } from "./ModulesPage";

const defaultSuggestions = [
  {
    icon: "📅",
    title: "Добави задача за тази седмица",
    prompt: "Искам да добавя нова маркетинг задача за тази седмица",
  },
  {
    icon: "⚠️",
    title: "Провери пропуснати задачи",
    prompt: "Има ли пропуснати задачи от миналите седмици?",
  },
  {
    icon: "💡",
    title: "Предложи стратегия",
    prompt: "Предложи ми маркетинг стратегия за следващите 4 седмици",
  },
];

const models = [
  { id: "simora-pro", name: "Simora Pro" },
  { id: "simora-fast", name: "Simora Fast" },
];

export default function AssistantPage() {
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const { markAsViewed } = useDailyTasks();
  const { overdueTasks } = useOverdueTasks();
  const [showOverdue, setShowOverdue] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const location = useLocation();
  const navigate = useNavigate();

  // Module state passed via navigation
  const moduleState = location.state?.module as {
    id: number;
    key: string;
    label: string;
    systemPrompt: string;
    initialMessage: string;
    prompts: { label: string; text: string }[];
    startPromptIndex?: number;
  } | undefined;

  // Track which prompts have been used in this module session
  const [usedPrompts, setUsedPrompts] = useState<Set<number>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const autoSentRef = useRef(false);

  const chatKey = moduleState
    ? "module:" + moduleState.systemPrompt.substring(0, 80)
    : "business";

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    updateSessionTitle,
    deleteSession,
    touchSession,
  } = useChatSessions(chatKey);

  // Mark as viewed when page opens
  useEffect(() => {
    markAsViewed();
  }, [markAsViewed]);

  // Auto-send the selected prompt when arriving from ModulesPage with a specific prompt
  const [autoSendPrompt, setAutoSendPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (
      moduleState?.startPromptIndex != null &&
      moduleState.prompts[moduleState.startPromptIndex] &&
      !autoSentRef.current
    ) {
      autoSentRef.current = true;
      setAutoSendPrompt(moduleState.prompts[moduleState.startPromptIndex].text);
    }
  }, [moduleState]);

  const handleNewChat = useCallback(async () => {
    await createSession();
  }, [createSession]);

  const handleFirstMessage = useCallback(async (text: string) => {
    if (!activeSessionId) return;
    const title = text.length > 60 ? text.substring(0, 57) + "..." : text;
    updateSessionTitle(activeSessionId, title);
    touchSession(activeSessionId);
  }, [activeSessionId, updateSessionTitle, touchSession]);

  // Track used prompts when a suggestion is clicked
  const handleSuggestionUsed = useCallback((promptText: string) => {
    if (!moduleState) return;
    const idx = moduleState.prompts.findIndex(p => p.text === promptText);
    if (idx >= 0) {
      setUsedPrompts(prev => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
    }
  }, [moduleState]);

  // Check if all prompts answered → show completion banner
  useEffect(() => {
    if (moduleState && usedPrompts.size >= moduleState.prompts.length) {
      setShowCompleted(true);
    }
  }, [usedPrompts.size, moduleState]);

  const goToNextModule = useCallback(() => {
    if (!moduleState) return;
    const nextModule = MODULES.find(m => m.id === moduleState.id + 1);
    if (nextModule) {
      navigate("/assistant", {
        state: {
          module: {
            id: nextModule.id,
            key: nextModule.key,
            label: nextModule.label,
            systemPrompt: nextModule.systemPrompt,
            initialMessage: nextModule.initialMessage,
            prompts: nextModule.prompts,
          },
        },
      });
      // Reset state for new module
      setUsedPrompts(new Set());
      setShowCompleted(false);
      autoSentRef.current = false;
    } else {
      navigate("/modules");
    }
  }, [moduleState, navigate]);

  const suggestions = moduleState
    ? moduleState.prompts.map((p, i) => ({
        icon: usedPrompts.has(i) ? "✅" : "✨",
        title: p.label,
        prompt: p.text,
      }))
    : defaultSuggestions;

  return (
    <MainLayout>
      <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex">
        {/* Sidebar */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
          onDeleteSession={deleteSession}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Header */}
          <div className="flex justify-center items-center py-2 md:py-3 shrink-0 relative">
            {moduleState && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-0 gap-1.5 text-muted-foreground"
                onClick={() => navigate("/modules")}
              >
                <ArrowLeft className="h-4 w-4" />
                Модули
              </Button>
            )}
            <div className="flex flex-col items-center gap-0.5">
              {moduleState && (
                <span className="text-xs text-muted-foreground font-medium">
                  {moduleState.label} ({usedPrompts.size}/{moduleState.prompts.length})
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 text-foreground hover:bg-secondary/50 px-3 py-1.5 rounded-xl transition-colors focus:outline-none">
                  <span className="font-semibold text-sm">{selectedModel.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[140px]">
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className={selectedModel.id === model.id ? "bg-secondary" : ""}
                    >
                      {model.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Module completion banner */}
          {showCompleted && moduleState && (
            <div className="px-3 md:px-4 pb-3 shrink-0">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {moduleState.label} завършен!
                  </span>
                  <Button
                    size="sm"
                    onClick={goToNextModule}
                    className="gap-1.5"
                  >
                    {MODULES.find(m => m.id === moduleState.id + 1)
                      ? `Към ${MODULES.find(m => m.id === moduleState.id + 1)!.label}`
                      : "Обратно към модулите"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Overdue Tasks Alert - Show only when not in module mode */}
          {!moduleState && showOverdue && overdueTasks.length > 0 && (
            <div className="px-3 md:px-4 pb-3 shrink-0">
              <div className="mx-auto max-w-3xl">
                <OverdueTasksSection compact maxTasks={3} />
              </div>
            </div>
          )}

          {/* Chat Interface - Full height */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              suggestions={suggestions}
              context="business"
              moduleSystemPrompt={moduleState?.systemPrompt}
              moduleInitialMessage={moduleState?.initialMessage}
              sessionId={activeSessionId}
              onFirstMessage={handleFirstMessage}
              autoSendPrompt={autoSendPrompt}
              onSuggestionUsed={handleSuggestionUsed}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
