import { useState, useEffect } from "react";
import { Plus, Users, UserCircle, ArrowLeft, Trash2, UserPlus, Mail, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TeamCard } from "@/components/teams/TeamCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useTeams, TeamWithMembers, DbTeamMember } from "@/hooks/useTeams";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Team, TeamMember } from "@/types";

export default function TeamsPage() {
  const { user } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const { teams, loading, createTeam, inviteMember, removeMember } = useTeams(currentProjectId);
  
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<DbTeamMember | null>(null);
  const [inviting, setInviting] = useState(false);

  // New team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  // New member form state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  const colors = [
    "hsl(221, 83%, 53%)",
    "hsl(174, 72%, 46%)",
    "hsl(262, 83%, 58%)",
    "hsl(25, 95%, 53%)",
    "hsl(142, 71%, 45%)",
  ];

  // Fetch user's project
  useEffect(() => {
    const fetchProject = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setCurrentProjectId(data.id);
      }
    };

    fetchProject();
  }, [user]);

  // Update selected team when teams change
  useEffect(() => {
    if (selectedTeam) {
      const updated = teams.find(t => t.id === selectedTeam.id);
      if (updated) {
        setSelectedTeam(updated);
      }
    }
  }, [teams]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createTeam(newTeamName, newTeamDescription);
    if (result) {
      setNewTeamOpen(false);
      setNewTeamName("");
      setNewTeamDescription("");
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setInviting(true);
    try {
      await inviteMember(selectedTeam.id, newMemberEmail, newMemberName, newMemberRole);
      setNewMemberOpen(false);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember(memberToRemove.id);
    setMemberToRemove(null);
  };

  // Convert DB team to UI team format
  const convertToUiTeam = (dbTeam: TeamWithMembers): Team => ({
    id: dbTeam.id,
    name: dbTeam.name,
    description: dbTeam.description || "",
    managerId: dbTeam.created_by || "",
    members: dbTeam.members.map(m => ({
      id: m.id,
      name: m.profile?.full_name || m.email.split("@")[0],
      email: m.email,
      role: m.role,
    })),
    color: colors[teams.indexOf(dbTeam) % colors.length],
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Влезте в профила си</h2>
          <p className="text-muted-foreground">За да управлявате екипите, първо трябва да влезете.</p>
        </div>
      </MainLayout>
    );
  }

  if (selectedTeam) {
    const teamMembers = selectedTeam.members;

    return (
      <MainLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setSelectedTeam(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад към екипите
          </Button>

          <div 
            className="rounded-xl p-8"
            style={{ background: `linear-gradient(135deg, ${colors[teams.indexOf(selectedTeam) % colors.length]} 0%, ${colors[teams.indexOf(selectedTeam) % colors.length]}99 100%)` }}
          >
            <h1 className="text-3xl font-display font-bold text-primary-foreground">
              {selectedTeam.name}
            </h1>
            <p className="mt-2 text-primary-foreground/80">{selectedTeam.description}</p>
            <div className="mt-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-foreground" />
              <span className="text-primary-foreground">{teamMembers.length} членове</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Членове на екипа</h2>
            <Dialog open={newMemberOpen} onOpenChange={setNewMemberOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl">
                  <Mail className="h-4 w-4 mr-2" />
                  Покани член
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Покани нов член</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInviteMember} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberName">Име</Label>
                    <Input
                      id="memberName"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Въведете име..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberEmail">Имейл</Label>
                    <Input
                      id="memberEmail"
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="email@company.bg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberRole">Роля</Label>
                    <Input
                      id="memberRole"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      placeholder="Напр. Дизайнер"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setNewMemberOpen(false)}>
                      Отказ
                    </Button>
                    <Button 
                      type="submit" 
                      className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl"
                      disabled={inviting}
                    >
                      {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Изпрати покана
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Team Members */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="glass-card rounded-xl p-4 animate-fade-in group relative">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <UserCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">
                        {member.profile?.full_name || member.email.split("@")[0]}
                      </h4>
                      <Badge variant={member.status === "accepted" ? "default" : "secondary"}>
                        {member.status === "pending" ? "Чакащ" : "Приет"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.role}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMemberToRemove(member);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {teamMembers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Няма членове в екипа</p>
              <p className="text-sm">Поканете членове с бутона по-горе</p>
            </div>
          )}
        </div>

        {/* Remove Member Confirmation */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Премахване на член</AlertDialogTitle>
              <AlertDialogDescription>
                Сигурни ли сте, че искате да премахнете <strong>{memberToRemove?.profile?.full_name || memberToRemove?.email}</strong> от екипа?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отказ</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Премахни
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Екипи</h1>
            <p className="mt-2 text-muted-foreground">
              Управлявайте екипите и членовете им
            </p>
          </div>
          <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl">
                <Plus className="h-4 w-4 mr-2" />
                Нов екип
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Създаване на нов екип</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTeam} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">Име на екипа</Label>
                  <Input
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Напр. Маркетинг екип"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamDescription">Описание</Label>
                  <Input
                    id="teamDescription"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="Кратко описание на екипа..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setNewTeamOpen(false)}>
                    Отказ
                  </Button>
                  <Button type="submit" className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl">
                    Създай екип
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Нямате екипи</h2>
            <p>Създайте първия си екип с бутона по-горе</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => (
              <TeamCard 
                key={team.id} 
                team={convertToUiTeam(team)} 
                onSelect={() => setSelectedTeam(team)} 
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
