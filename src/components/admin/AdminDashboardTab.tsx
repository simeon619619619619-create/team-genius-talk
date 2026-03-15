import { AdminStats } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Crown, TrendingUp, MessageSquare, Ticket, Activity } from "lucide-react";

interface AdminDashboardTabProps {
  stats: AdminStats;
}

function StatCard({ title, value, subtitle, icon: Icon, color }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Users;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardTab({ stats }: AdminDashboardTabProps) {
  const revenue = (stats.lifetimeUsers * 239.99) + (stats.yearlyUsers * 79.99) + (stats.monthlyUsers * 10.99);

  return (
    <div className="space-y-6">
      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Общо потребители"
          value={stats.totalUsers}
          subtitle={`+${stats.newUsersToday} днес`}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Абонати"
          value={stats.totalSubscribers}
          subtitle={`${stats.freeUsers} безплатни`}
          icon={CreditCard}
          color="bg-green-500"
        />
        <StatCard
          title="Приблизителен приход"
          value={`$${revenue.toFixed(0)}`}
          subtitle="общ приход"
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatCard
          title="Активни днес"
          value={stats.activeUsersToday}
          subtitle={`${stats.totalMessages} съобщения`}
          icon={Activity}
          color="bg-orange-500"
        />
      </div>

      {/* Subscription breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Абонаментни планове
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats.lifetimeUsers}</p>
              <p className="text-sm text-muted-foreground">Lifetime ($239.99)</p>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-yellow-500 transition-all"
                  style={{ width: `${stats.totalUsers ? (stats.lifetimeUsers / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.yearlyUsers}</p>
              <p className="text-sm text-muted-foreground">Yearly ($79.99)</p>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${stats.totalUsers ? (stats.yearlyUsers / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{stats.monthlyUsers}</p>
              <p className="text-sm text-muted-foreground">Monthly ($10.99)</p>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${stats.totalUsers ? (stats.monthlyUsers / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.freeUsers}</p>
              <p className="text-sm text-muted-foreground">Безплатни</p>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-muted-foreground/30 transition-all"
                  style={{ width: `${stats.totalUsers ? (stats.freeUsers / stats.totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Нови днес</p>
                <p className="text-2xl font-bold">{stats.newUsersToday}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Нови тази седмица</p>
                <p className="text-2xl font-bold">{stats.newUsersThisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Нови този месец</p>
                <p className="text-2xl font-bold">{stats.newUsersThisMonth}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Използване
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
              <p className="text-sm text-muted-foreground">Чат сесии</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMessages}</p>
              <p className="text-sm text-muted-foreground">Съобщения</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalPromoActivations}</p>
              <p className="text-sm text-muted-foreground">Промо активации</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
