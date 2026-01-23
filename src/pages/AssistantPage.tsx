import { MainLayout } from "@/components/layout/MainLayout";
import { ChatInterface } from "@/components/chat/ChatInterface";

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

export default function AssistantPage() {
  return (
    <MainLayout>
      <div className="h-[calc(100vh-3rem)] flex flex-col">
        <ChatInterface suggestions={suggestions} />
      </div>
    </MainLayout>
  );
}
