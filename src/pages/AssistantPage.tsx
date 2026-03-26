import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChevronDown, ArrowLeft, ChevronRight, Bot, Zap, PartyPopper, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { useOverdueTasks } from "@/hooks/useOverdueTasks";
import { OverdueTasksSection } from "@/components/dashboard/OverdueTasksSection";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useChatSessions } from "@/hooks/useChatSessions";
import { MODULES } from "./ModulesPage";
import type { AiBot } from "@/components/teams/VirtualOffice";
import { useMethodologyProgress } from "@/hooks/useMethodologyProgress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const defaultSuggestions = [
  {
    icon: "",
    title: "Добави задача за тази седмица",
    prompt: "Искам да добавя нова маркетинг задача за тази седмица",
  },
  {
    icon: "",
    title: "Провери пропуснати задачи",
    prompt: "Има ли пропуснати задачи от миналите седмици?",
  },
  {
    icon: "",
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
  const [aiBots, setAiBots] = useState<AiBot[]>([]);
  const [selectedBot, setSelectedBot] = useState<AiBot | null>(null);
  const { user } = useAuth();
  const { markAsViewed } = useDailyTasks();
  const { completeModule, isModuleCompleted } = useMethodologyProgress();

  const { overdueTasks } = useOverdueTasks();
  const [showOverdue, setShowOverdue] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const location = useLocation();
  const navigate = useNavigate();

  // Load AI bots from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("simora_ai_bots");
      if (saved) setAiBots(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Auto-select bot when navigating from game or business process
  const [autoSendProcessMsg, setAutoSendProcessMsg] = useState<string | null>(null);

  useEffect(() => {
    const navBot = location.state?.selectedBot as AiBot | undefined;
    const processCtx = location.state?.processContext as { stepTitle: string; actionText: string; initialMessage: string } | undefined;

    if (navBot) {
      setSelectedBot(navBot);
    }
    if (processCtx?.initialMessage) {
      setAutoSendProcessMsg(processCtx.initialMessage);
    }
    if (navBot || processCtx) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);

  // Reset state when module changes (same-path navigation doesn't unmount)
  const prevModuleIdRef = useRef(moduleState?.id);
  useEffect(() => {
    if (moduleState && moduleState.id !== prevModuleIdRef.current) {
      prevModuleIdRef.current = moduleState.id;
      setChatMessages([]);
      setUsedPrompts(new Set());
      setShowCompleted(false);
      completionTriggeredRef.current = false;
      autoSentRef.current = false;
    }
  }, [moduleState?.id]);

  // Auto-route to best bot based on message content
  const [autoRouted, setAutoRouted] = useState(false);
  const routeToBestBot = useCallback((message: string) => {
    if (aiBots.length === 0 || moduleState) return;
    const msgLower = message.toLowerCase();

    // Keyword matching per bot skill
    let bestBot: AiBot | null = null;
    let bestScore = 0;

    for (const bot of aiBots) {
      let score = 0;
      const allKeywords = [
        ...(bot.skills || []),
        ...(bot.automations || []),
        bot.role,
        bot.process,
      ];
      for (const keyword of allKeywords) {
        if (keyword && msgLower.includes(keyword.toLowerCase())) {
          score += keyword.length; // longer matches = more specific
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestBot = bot;
      }
    }

    if (bestBot && bestScore >= 3 && bestBot.id !== selectedBot?.id) {
      setSelectedBot(bestBot);
      setAutoRouted(true);
      setTimeout(() => setAutoRouted(false), 3000);
    }
  }, [aiBots, selectedBot, moduleState]);

  const otherBotsList = aiBots.filter(b => b.id !== selectedBot?.id).map(b => `${b.name} (${b.role})`).join(", ");

  const botSystemPrompt = selectedBot
    ? `Ти си ${selectedBot.name}, ${selectedBot.role}. Процес: ${selectedBot.process}. Умения: ${(selectedBot.skills || []).join(", ")}. Автоматизации: ${selectedBot.automations.join(", ")}. Отговаряй винаги на български. Когато те питат нещо от твоята област, давай конкретни отговори. Ако задачата е извън уменията ти, препоръчай конкретен бот от екипа: ${otherBotsList}. НЕ измисляй ботове които не съществуват. ВАЖНО: Ние използваме Resend за изпращане на имейли (не MailChimp, не ActiveCampaign). Уебсайтовете ни са: eufashioninstitute.com, simora.bg, socialempire.bg. Можеш да изпращаш имейли с инструмента send_email.`
    : undefined;

  const botInitialMessage = selectedBot
    ? `Здравейте! Аз съм ${selectedBot.name} — ${selectedBot.role}. Мога да помогна с: ${(selectedBot.skills || []).join(", ")}.\n\nКакво да направя?`
    : undefined;

  const chatKey = moduleState
    ? "module:" + moduleState.systemPrompt.substring(0, 80)
    : selectedBot
      ? "bot:" + selectedBot.id
      : "business";

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
    updateSessionTitle,
    deleteSession,
    touchSession,
    markModuleCompleted,
  } = useChatSessions(chatKey, moduleState ? moduleState.label : undefined);

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
    if (moduleState) {
      await createSession(moduleState.label, moduleState.key);
    } else {
      await createSession();
    }
  }, [createSession, moduleState]);

  const handleFirstMessage = useCallback(async (text: string) => {
    if (!activeSessionId) return;
    // Don't override module session titles
    if (moduleState) return;
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

  // Check module completion: by prompt buttons OR by AI content detection
  const completionTriggeredRef = useRef(false);

  // Track if current module is already completed (for showing banner)
  const moduleAlreadyCompleted = moduleState ? isModuleCompleted(moduleState.key) : false;

  // Module completes ONLY when ALL prompts/questions have been used
  useEffect(() => {
    if (!moduleState || showCompleted || completionTriggeredRef.current) return;

    const allPromptsUsed = usedPrompts.size >= moduleState.prompts.length;

    if (allPromptsUsed) {
      completionTriggeredRef.current = true;
      setShowCompleted(true);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#8b5cf6', '#ec4899'] });
      setTimeout(() => { confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#34d399', '#6ee7b7'] }); confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#fbbf24', '#f59e0b', '#fcd34d'] }); }, 250);
      if (moduleState.key && user) {
        (async () => {
          const ck = "module:" + moduleState.systemPrompt.substring(0, 80);
          const { data: msgs } = await supabase
            .from("chat_messages")
            .select("role, content")
            .eq("user_id", user.id)
            .eq("chat_key", ck)
            .order("created_at", { ascending: true })
            .limit(100);

          const summary = (msgs || [])
            .map(m => `${m.role === "user" ? "Потребител" : "Асистент"}: ${m.content}`)
            .join("\n\n");

          completeModule(moduleState.key, summary || undefined);
        })();
        if (activeSessionId) {
          markModuleCompleted(activeSessionId, moduleState.label);
        }
        // Auto-advance to next module after 4 seconds
        setTimeout(() => {
          goToNextModule();
        }, 4000);
      }
    }
  }, [usedPrompts.size, moduleState, completeModule, user, showCompleted, activeSessionId, markModuleCompleted]);

  const goToNextModule = useCallback(() => {
    if (!moduleState) return;
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#8b5cf6', '#ec4899'] });
    setTimeout(() => { confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#34d399', '#6ee7b7'] }); confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#fbbf24', '#f59e0b', '#fcd34d'] }); }, 250);
    const nextModule = MODULES.find(m => m.id === moduleState.id + 1);
    setTimeout(() => {
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
        setUsedPrompts(new Set());
        setShowCompleted(false);
        completionTriggeredRef.current = false;
        autoSentRef.current = false;
      } else {
        navigate("/modules");
      }
    }, 800);
  }, [moduleState, navigate]);

  const suggestions = moduleState
    ? moduleState.prompts.map((p, i) => ({
        icon: usedPrompts.has(i) ? "" : "",
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
              <div className="flex items-center gap-2">
                {/* Model selector */}
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

                {/* Bot selector */}
                {!moduleState && aiBots.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1.5 text-foreground hover:bg-secondary/50 px-3 py-1.5 rounded-xl transition-colors focus:outline-none border border-border/50">
                      <Bot className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-sm font-medium">
                        {selectedBot ? selectedBot.name : "Симора"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="min-w-[180px]">
                      <DropdownMenuItem
                        onClick={() => setSelectedBot(null)}
                        className={!selectedBot ? "bg-secondary" : ""}
                      >
                        Симора (общ асистент)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">AI Ботове</DropdownMenuLabel>
                      {aiBots.map((b) => (
                        <DropdownMenuItem
                          key={b.id}
                          onClick={() => setSelectedBot(b)}
                          className={selectedBot?.id === b.id ? "bg-secondary" : ""}
                        >
                          <span
                            className="w-3 h-3 rounded-full mr-2 shrink-0"
                            style={{ background: b.shirtColor }}
                          />
                          <span className="flex-1">{b.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">{b.role}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Banner for already-completed module: go to next */}
          {moduleAlreadyCompleted && !showCompleted && moduleState && (
            <div className="mx-4 mt-2 mb-0 p-4 rounded-lg bg-green-500/15 border border-green-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Този модул е завършен.</span>
              </div>
              <Button onClick={goToNextModule} className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                {MODULES.find(m => m.id === moduleState.id + 1)
                  ? `Премини към следващия модул →`
                  : "Обратно към модулите"}
              </Button>
            </div>
          )}

          {/* Module completion overlay */}
          {showCompleted && moduleState && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
              <div className="flex flex-col items-center gap-6 text-center px-6">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <PartyPopper className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">{moduleState.label} завършен!</h2>
                  <p className="text-muted-foreground">
                    {MODULES.find(m => m.id === moduleState.id + 1)
                      ? `Следва: ${MODULES.find(m => m.id === moduleState.id + 1)!.label}`
                      : "Поздравления! Всички модули са завършени!"}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={goToNextModule}
                  className="gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-green-500/25"
                >
                  {MODULES.find(m => m.id === moduleState.id + 1)
                    ? "Продължи към следващия модул"
                    : "Обратно към модулите"}
                  <ChevronRight className="h-5 w-5" />
                </Button>
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

          {/* Auto-route notification */}
          {autoRouted && selectedBot && (
            <div className="px-3 md:px-4 pb-2 shrink-0 animate-fade-in">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm">
                  <Zap className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span className="text-purple-700 dark:text-purple-300">
                    Пренасочено към <strong>{selectedBot.name}</strong> — {selectedBot.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Chat Interface - Full height */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              suggestions={suggestions}
              context="business"
              moduleSystemPrompt={moduleState?.systemPrompt || botSystemPrompt}
              moduleInitialMessage={moduleState?.initialMessage || botInitialMessage}
              sessionId={activeSessionId}
              onFirstMessage={handleFirstMessage}
              onMessage={routeToBestBot}
              autoSendPrompt={autoSendPrompt || autoSendProcessMsg}
              onSuggestionUsed={handleSuggestionUsed}
              onMessagesChange={setChatMessages}
            />
          </div>

          {/* Quick bot switch - always visible at bottom */}
          {!moduleState && aiBots.length > 0 && (
            <div className="shrink-0 px-3 pb-1">
              <div className="mx-auto max-w-3xl flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[10px] text-muted-foreground shrink-0">Ботове:</span>
                <button
                  onClick={() => setSelectedBot(null)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    !selectedBot ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  Симора
                </button>
                {aiBots.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBot(b)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      selectedBot?.id === b.id ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.shirtColor }} />
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
