import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { useOverdueTasks } from "@/hooks/useOverdueTasks";
import { OverdueTasksSection } from "@/components/dashboard/OverdueTasksSection";
const suggestions = [
  {
    icon: "💡",
    title: "Генерирай бизнес идея",
    prompt: "Дай ми идея за онлайн бизнес",
  },
  {
    icon: "🎯",
    title: "Маркетинг стратегия",
    prompt: "Създай маркетинг план за малък бизнес",
  },
  {
    icon: "📊",
    title: "Анализ на конкуренцията",
    prompt: "Как да анализирам конкурентите си",
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

  // Mark as viewed when page opens
  useEffect(() => {
    markAsViewed();
  }, [markAsViewed]);

  // Hide overdue section after user dismisses it
  const handleDismissOverdue = () => {
    setShowOverdue(false);
  };
  return (
    <MainLayout>
      <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] flex flex-col">
        {/* Header with Model Selector - ChatGPT style */}
        <div className="flex justify-center py-2 md:py-3 shrink-0">
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

        {/* Overdue Tasks Alert - Show at top when entering assistant */}
        {showOverdue && overdueTasks.length > 0 && (
          <div className="px-3 md:px-4 pb-3 shrink-0">
            <div className="mx-auto max-w-3xl">
              <OverdueTasksSection compact maxTasks={3} />
            </div>
          </div>
        )}

        {/* Chat Interface - Full height */}
        <div className="flex-1 min-h-0">
          <ChatInterface suggestions={suggestions} />
        </div>
      </div>
    </MainLayout>
  );
}
