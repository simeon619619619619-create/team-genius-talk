import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Sparkles, Lightbulb, Target, TrendingUp } from "lucide-react";

const suggestions = [
  {
    icon: Lightbulb,
    title: "Генерирай бизнес идея",
    prompt: "Дай ми идея за онлайн бизнес",
  },
  {
    icon: Target,
    title: "Маркетинг стратегия",
    prompt: "Създай маркетинг план за малък бизнес",
  },
  {
    icon: TrendingUp,
    title: "Анализ на конкуренцията",
    prompt: "Как да анализирам конкурентите си",
  },
];

export default function AssistantPage() {
  return (
    <MainLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                AI Бизнес Асистент
              </h1>
              <p className="text-muted-foreground">
                Говорете или пишете за бизнес планиране
              </p>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="mt-4 flex gap-3 flex-wrap">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.title}
                className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <suggestion.icon className="h-4 w-4 text-primary" />
                {suggestion.title}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 glass-card rounded-xl overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </MainLayout>
  );
}
