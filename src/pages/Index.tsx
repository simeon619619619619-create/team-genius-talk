import { Users, ListTodo, TrendingUp, Target } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DailyPlanWidget } from "@/components/dashboard/DailyPlanWidget";
import { mockTeams, mockTasks, mockMembers } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuickCreateButton } from "@/components/dashboard/QuickCreateButton";

const Index = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const completedTasks = mockTasks.filter(t => t.status === "done").length;
  const inProgressTasks = mockTasks.filter(t => t.status === "in-progress").length;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserName(data?.full_name || null);
    };
    fetchProfile();
  }, [user]);

  const displayName = userName || user?.email?.split('@')[0] || 'BizPlanAI';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 animate-slide-up">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-display font-bold text-foreground">
              Добре дошли, <span className="font-bold truncate">{displayName}</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Вашият AI асистент за бизнес планиране и маркетинг
            </p>
          </div>
          <QuickCreateButton />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Общо екипи"
            value={mockTeams.length}
            icon={Users}
            trend={{ value: 10, positive: true }}
          />
          <StatCard
            title="Членове на екипа"
            value={mockMembers.length}
            icon={Target}
          />
          <StatCard
            title="Задачи в процес"
            value={inProgressTasks}
            icon={TrendingUp}
          />
          <StatCard
            title="Завършени задачи"
            value={completedTasks}
            icon={ListTodo}
            trend={{ value: 25, positive: true }}
          />
        </div>

        {/* Main Content - Reorganized */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Plan Widget - Takes prominence */}
          <div className="lg:col-span-1">
            <DailyPlanWidget />
          </div>

          {/* AI Chat */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">
                AI Асистент
              </h2>
              <p className="text-sm text-muted-foreground">
                Говорете или пишете за бизнес планиране
              </p>
            </div>
            <div className="h-[500px]">
              <ChatInterface />
            </div>
          </div>
        </div>

        {/* Secondary Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Последни задачи
            </h2>
            <div className="space-y-2">
              {mockTasks.slice(0, 4).map((task) => {
                const assignee = mockMembers.find(m => m.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className={`h-2 w-2 rounded-full ${
                      task.status === "done" ? "bg-foreground" :
                      task.status === "in-progress" ? "bg-foreground/60" : "bg-muted-foreground/40"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{assignee?.name}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${
                      task.priority === "high" ? "bg-secondary text-foreground" :
                      task.priority === "medium" ? "bg-secondary text-muted-foreground" :
                      "bg-secondary/50 text-muted-foreground"
                    }`}>
                      {task.priority === "high" ? "Високо" : task.priority === "medium" ? "Средно" : "Ниско"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teams Overview */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Екипи
            </h2>
            <div className="space-y-2">
              {mockTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Users className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.members.length} членове
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
