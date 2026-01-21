import { MainLayout } from "@/components/layout/MainLayout";
import { useAdmin } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilesTab } from "@/components/admin/ProfilesTab";
import { RolesTab } from "@/components/admin/RolesTab";
import { GlobalBotsTab } from "@/components/admin/GlobalBotsTab";
import { Shield, Users, Bot, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    profiles,
    roles,
    globalBots,
    isAdmin,
    loading,
    updateProfile,
    deleteProfile,
    addRole,
    updateRole,
    deleteRole,
    updateGlobalBot,
    createGlobalBot,
    deleteGlobalBot,
  } = useAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Администраторска конзола</h1>
            <p className="text-muted-foreground">Управление на потребители, роли и глобални ботове</p>
          </div>
        </div>

        <Tabs defaultValue="profiles" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Профили
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Роли
            </TabsTrigger>
            <TabsTrigger value="bots" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Ботове
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </MainLayout>
  );
}
