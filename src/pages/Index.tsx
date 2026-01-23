import { Users, ListTodo, TrendingUp, Target } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { mockTeams, mockTasks, mockMembers } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        <div className="animate-slide-up">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Добре дошли, <span className="text-gradient">{displayName}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Вашият AI асистент за бизнес планиране и маркетинг
          </p>
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Chat */}
          <div className="glass-card rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-display font-semibold text-foreground">
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

          {/* Quick Actions & Recent Activity */}
          <div className="space-y-6">
            {/* Recent Tasks */}
            <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">
                Последни задачи
              </h2>
              <div className="space-y-3">
                {mockTasks.slice(0, 4).map((task) => {
                  const assignee = mockMembers.find(m => m.id === task.assigneeId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className={`h-2 w-2 rounded-full ${
                        task.status === "done" ? "bg-success" :
                        task.status === "in-progress" ? "bg-primary" : "bg-muted-foreground"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{assignee?.name}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.priority === "high" ? "bg-destructive/10 text-destructive" :
                        task.priority === "medium" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {task.priority === "high" ? "Високо" : task.priority === "medium" ? "Средно" : "Ниско"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teams Overview */}
            <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">
                Екипи
              </h2>
              <div className="space-y-3">
                {mockTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ background: team.color }}
                    >
                      <Users className="h-5 w-5 text-primary-foreground" />
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
      </div>
    </MainLayout>
  );
};

export default Index;
