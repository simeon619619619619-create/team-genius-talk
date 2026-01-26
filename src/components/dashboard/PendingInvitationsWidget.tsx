import { Building2, Briefcase, Shield, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePendingInvitations, PendingInvitation } from "@/hooks/usePendingInvitations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { bg } from "date-fns/locale";

function getRoleLabel(role: string): string {
  const roles: Record<string, string> = {
    admin: "Администратор",
    manager: "Мениджър",
    member: "Член",
    viewer: "Зрител",
  };
  return roles[role] || role;
}

function getPermissionsLabel(permissions: PendingInvitation["permissions"]): string[] {
  if (!permissions) return ["Няма зададени права"];
  
  if (permissions.can_view_all) {
    return ["Всички секции"];
  }
  
  const labels: string[] = [];
  if (permissions.can_view_tasks) labels.push("Задачи");
  if (permissions.can_view_business_plan) labels.push("Бизнес план");
  if (permissions.can_view_annual_plan) labels.push("Годишен план");
  
  return labels.length > 0 ? labels : ["Няма зададени права"];
}

export function PendingInvitationsWidget() {
  const { user } = useAuth();
  const { invitations, loading, refetch } = usePendingInvitations();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (invitation: PendingInvitation) => {
    if (!user) return;
    
    setProcessingId(invitation.id);
    try {
      // Step 1: Update team member with user_id and status FIRST
      // This is required for the RLS policy on user_roles to work
      const { error: memberError } = await supabase
        .from("team_members")
        .update({
          user_id: user.id,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.team_member_id);

      if (memberError) {
        console.error("Error updating team member:", memberError);
        throw memberError;
      }

      // Step 2: Create user_role entry for project access
      // Now that team_member status is 'accepted', the RLS policy will allow this
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("project_id", invitation.project.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase.from("user_roles").insert({
          project_id: invitation.project.id,
          user_id: user.id,
          role: "viewer",
          invited_email: invitation.team_member.email,
        });

        if (roleError) {
          console.error("Error creating user role:", roleError);
          // Don't throw - the team member is already accepted
        }
      }

      // Step 3: Mark invitation as used
      const { error: inviteError } = await supabase
        .from("team_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (inviteError) {
        console.error("Error marking invitation as used:", inviteError);
      }

      toast.success("Успешно се присъединихте към екипа!");
      
      // Reload the page to refresh all data including organization context
      window.location.reload();
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error("Грешка при приемане на поканата");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: PendingInvitation) => {
    setProcessingId(invitation.id);
    try {
      // Delete team member entry
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", invitation.team_member_id);

      if (error) throw error;

      toast.success("Поканата е отхвърлена");
      refetch();
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast.error("Грешка при отхвърляне на поканата");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 animate-slide-up">
      {invitations.map((invitation) => (
        <Card key={invitation.id} className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Покана за присъединяване
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Organization Name */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Организация</p>
              <p className="font-semibold text-lg">
                {invitation.organization?.name || invitation.project.name}
              </p>
            </div>

            {/* Team Name */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Екип</p>
              <p className="font-medium">{invitation.team.name}</p>
            </div>

            {/* Role */}
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Роля:</span>
              <Badge variant="secondary">{getRoleLabel(invitation.team_member.role)}</Badge>
            </div>

            {/* Permissions */}
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-sm text-muted-foreground">Права за достъп:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getPermissionsLabel(invitation.permissions).map((perm, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Expiry */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Валидна до: {format(new Date(invitation.expires_at), "d MMM yyyy, HH:mm", { locale: bg })}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleAccept(invitation)}
                disabled={processingId === invitation.id}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Приеми
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDecline(invitation)}
                disabled={processingId === invitation.id}
              >
                <X className="h-4 w-4 mr-1" />
                Откажи
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
