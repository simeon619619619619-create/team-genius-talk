import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "accepted" | "error">("loading");
  const [invitation, setInvitation] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setStatus("invalid");
        return;
      }

      try {
        // Fetch invitation
        const { data: invitationData, error: inviteError } = await supabase
          .from("team_invitations")
          .select("*, team_members(*)")
          .eq("token", token)
          .single();

        if (inviteError || !invitationData) {
          setStatus("invalid");
          return;
        }

        // Check if already used
        if (invitationData.used_at) {
          setStatus("accepted");
          return;
        }

        // Check if expired
        if (new Date(invitationData.expires_at) < new Date()) {
          setStatus("invalid");
          return;
        }

        setInvitation(invitationData);

        // Fetch team info
        const { data: teamData } = await supabase
          .from("teams")
          .select("*")
          .eq("id", invitationData.team_members.team_id)
          .single();

        setTeam(teamData);
        setStatus("valid");
      } catch (error) {
        setStatus("error");
      }
    };

    if (!authLoading) {
      validateInvitation();
    }
  }, [token, authLoading]);

  const handleAccept = async () => {
    if (!user) {
      // Redirect to auth with return URL
      toast.info("Моля, влезте или се регистрирайте, за да приемете поканата");
      navigate(`/auth?redirect=/accept-invitation?token=${token}`);
      return;
    }

    try {
      setStatus("loading");

      // Update team member with user_id and status
      const { error: memberError } = await supabase
        .from("team_members")
        .update({
          user_id: user.id,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.team_member_id);

      if (memberError) throw memberError;

      // Mark invitation as used
      const { error: inviteError } = await supabase
        .from("team_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (inviteError) throw inviteError;

      toast.success("Успешно се присъединихте към екипа!");
      navigate("/teams");
    } catch (error: any) {
      toast.error("Грешка при приемане на поканата");
      setStatus("valid");
    }
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Зареждане...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
            <CardTitle className="mt-4">Невалидна покана</CardTitle>
            <CardDescription>
              Тази покана е невалидна или е изтекла.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")} variant="outline">
              Към началото
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-primary" />
            <CardTitle className="mt-4">Поканата вече е приета</CardTitle>
            <CardDescription>
              Тази покана вече е била използвана.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/teams")}>
              Към екипите
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive" />
            <CardTitle className="mt-4">Грешка</CardTitle>
            <CardDescription>
              Възникна грешка при обработка на поканата.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")} variant="outline">
              Към началото
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full gradient-primary flex items-center justify-center">
            <Users className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Покана за екип</CardTitle>
          <CardDescription>
            Поканени сте да се присъедините към екип
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {team && (
            <div className="rounded-lg bg-secondary p-4 text-center">
              <h3 className="text-xl font-bold">{team.name}</h3>
              {team.description && (
                <p className="text-muted-foreground mt-1">{team.description}</p>
              )}
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Вашата роля: <strong>{invitation?.team_members?.role}</strong></p>
          </div>

          {!user && (
            <p className="text-center text-sm text-muted-foreground">
              Трябва да влезете или да се регистрирате, за да приемете поканата.
            </p>
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate("/")}
            >
              Откажи
            </Button>
            <Button 
              className="flex-1 gradient-primary text-primary-foreground"
              onClick={handleAccept}
            >
              {user ? "Приеми поканата" : "Влез и приеми"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
