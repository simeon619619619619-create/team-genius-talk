import { MainLayout } from "@/components/layout/MainLayout";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilesTab } from "@/components/admin/ProfilesTab";
import { RolesTab } from "@/components/admin/RolesTab";
import { GlobalBotsTab } from "@/components/admin/GlobalBotsTab";
import { AdminDashboardTab } from "@/components/admin/AdminDashboardTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";
import { PromoCodesTab } from "@/components/admin/PromoCodesTab";
import { PricingTab } from "@/components/admin/PricingTab";
import { AppHealthTab } from "@/components/admin/AppHealthTab";
import { BusinessDirectoryTab } from "@/components/admin/BusinessDirectoryTab";
import { Shield, Users, Bot, Loader2, LayoutDashboard, CreditCard, Ticket, DollarSign, Activity, RefreshCw, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    profiles,
    roles,
    globalBots,
    isAdmin,
    loading: adminLoading,
    updateProfile,
    deleteProfile,
    addRole,
    updateRole,
    deleteRole,
    updateGlobalBot,
    createGlobalBot,
    deleteGlobalBot,
  } = useAdmin();

  const {
    isSuperAdmin,
    loading: dashLoading,
    stats,
    users,
    promoCodes,
    healthChecks,
    fetchStats,
    createPromoCode,
    togglePromoCode,
    deletePromoCode,
    runHealthCheck,
    updateUserSubscription,
    refetch,
  } = useAdminDashboard();

  const loading = adminLoading || dashLoading;
  const hasAccess = isAdmin || isSuperAdmin;

  // Auto health check every 30 minutes
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hasAccess || loading) return;

    // Run initial health check
    runHealthCheck();

    // Set up 30-minute interval
    intervalRef.current = setInterval(() => {
      runHealthCheck();
      refetch();
    }, 30 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasAccess, loading]);

  const handleManualRefresh = useCallback(async () => {
    toast.promise(
      Promise.all([refetch(), runHealthCheck()]),
      {
        loading: "Обновяване на данните...",
        success: "Данните са обновени",
        error: "Грешка при обновяване",
      }
    );
  }, [refetch, runHealthCheck]);

  useEffect(() => {
    if (!loading && !hasAccess) {
      navigate("/dashboard");
    }
  }, [loading, hasAccess, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Администраторска конзола</h1>
              <p className="text-muted-foreground">Пълно управление на Simora</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleManualRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Обнови
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Абонаменти</span>
            </TabsTrigger>
            <TabsTrigger value="promos" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <Ticket className="h-4 w-4" />
              <span className="hidden sm:inline">Промо кодове</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Цени</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Профили</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Роли</span>
            </TabsTrigger>
            <TabsTrigger value="bots" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Ботове</span>
            </TabsTrigger>
            <TabsTrigger value="directory" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Директория</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2 data-[state=active]:bg-secondary rounded-full px-4 py-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Health</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {stats && <AdminDashboardTab stats={stats} />}
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsTab
              users={users}
              onUpdateSubscription={updateUserSubscription}
            />
          </TabsContent>

          <TabsContent value="promos">
            <PromoCodesTab
              promoCodes={promoCodes}
              onCreatePromo={createPromoCode}
              onTogglePromo={togglePromoCode}
              onDeletePromo={deletePromoCode}
            />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingTab />
          </TabsContent>

          <TabsContent value="profiles">
            <ProfilesTab
              profiles={profiles}
              onUpdateProfile={updateProfile}
              onDeleteProfile={deleteProfile}
            />
          </TabsContent>

          <TabsContent value="roles">
            <RolesTab
              roles={roles}
              profiles={profiles}
              onAddRole={addRole}
              onUpdateRole={updateRole}
              onDeleteRole={deleteRole}
            />
          </TabsContent>

          <TabsContent value="bots">
            <GlobalBotsTab
              bots={globalBots}
              onUpdateBot={updateGlobalBot}
              onCreateBot={createGlobalBot}
              onDeleteBot={deleteGlobalBot}
            />
          </TabsContent>

          <TabsContent value="directory">
            <BusinessDirectoryTab />
          </TabsContent>

          <TabsContent value="health">
            <AppHealthTab
              healthChecks={healthChecks}
              onRunCheck={runHealthCheck}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
