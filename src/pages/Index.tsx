import { Users, ListTodo, TrendingUp, Target } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DailyPlanWidget } from "@/components/dashboard/DailyPlanWidget";
import { OverdueTasksSection } from "@/components/dashboard/OverdueTasksSection";
import { PendingInvitationsWidget } from "@/components/dashboard/PendingInvitationsWidget";
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
      <div className="space-y-4 md:space-y-6">
        {/* Header - Compact on mobile */}
        <div className="flex items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground truncate">
              Добре дошли, {displayName}
            </h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Вашият AI асистент за бизнес планиране и маркетинг
            </p>
          </div>
          <QuickCreateButton />
        </div>

        {/* Pending Invitations - Show at the top */}
        <PendingInvitationsWidget />

        {/* Stats - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          <StatCard
            title="Екипи"
            value={mockTeams.length}
            icon={Users}
          />
          <StatCard
            title="Членове"
            value={mockMembers.length}
            icon={Target}
          />
          <StatCard
            title="В процес"
            value={inProgressTasks}
            icon={TrendingUp}
          />
          <StatCard
            title="Завършени"
            value={completedTasks}
            icon={ListTodo}
          />
        </div>

        {/* Overdue Tasks Section - Show on both mobile and desktop */}
        <OverdueTasksSection maxTasks={3} />

        {/* Main Content - Stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Daily Plan Widget - Hidden on mobile (shown in Assistant page) */}
          <div className="lg:col-span-1 hidden lg:block">
            <DailyPlanWidget />
          </div>
          {/* AI Chat */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">
                AI Асистент
              </h2>
            </div>
            <div className="h-[400px] md:h-[500px]">
              <ChatInterface />
            </div>
          </div>
        </div>

        {/* Secondary Content - Single column on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Tasks */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground mb-3">
              Последни задачи
            </h2>
            <div className="space-y-1.5">
              {mockTasks.slice(0, 3).map((task) => {
                const assignee = mockMembers.find(m => m.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      task.status === "done" ? "bg-foreground" :
                      task.status === "in-progress" ? "bg-foreground/60" : "bg-muted-foreground/40"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      task.priority === "high" ? "bg-secondary text-foreground" :
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
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground mb-3">
              Екипи
            </h2>
            <div className="space-y-1.5">
              {mockTeams.slice(0, 3).map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{team.name}</p>
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
