import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

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

  return (
    <MainLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col">
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
        <ChatInterface suggestions={suggestions} />
      </div>
    </MainLayout>
  );
}
