import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DailyPlanWidget } from "@/components/dashboard/DailyPlanWidget";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useDailyTasks } from "@/hooks/useDailyTasks";

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

  // Mark as viewed when page opens
  useEffect(() => {
    markAsViewed();
  }, [markAsViewed]);

  return (
    <MainLayout>
      <div className="h-[calc(100vh-3rem)] flex gap-6">
        {/* Daily Tasks Sidebar */}
        <div className="w-80 shrink-0 hidden lg:block">
          <DailyPlanWidget />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="border-b border-border/50 px-4 py-3 flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-foreground hover:bg-secondary/50 px-3 py-1.5 rounded-lg transition-colors focus:outline-none">
                <span className="font-semibold">{selectedModel.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-[160px]">
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
          
          {/* Mobile Daily Tasks */}
          <div className="lg:hidden p-4 border-b border-border/50">
            <DailyPlanWidget />
          </div>

          <ChatInterface suggestions={suggestions} />
        </div>
      </div>
    </MainLayout>
  );
}
