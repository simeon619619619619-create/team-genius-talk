import { useState, useEffect } from "react";
import { Plus, Users, UserCircle, ArrowLeft, Trash2, Mail, Loader2, Pencil, Copy, Check } from "lucide-react";
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
  const { teams, loading, createTeam, updateTeam, inviteMember, removeMember } = useTeams(currentProjectId);
  
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<DbTeamMember | null>(null);
  const [inviting, setInviting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // New team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  // Edit team form state
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");

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

  // Fetch or create user's project
  useEffect(() => {
    const fetchOrCreateProject = async () => {
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      // Try to fetch existing project using maybeSingle to avoid errors when no data
      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setCurrentProjectId(data.id);
      } else if (!error || error.code === 'PGRST116') {
        // No project found, create a default one
        const { data: newProject, error: createError } = await supabase
          .from("projects")
          .insert({
            name: "Моят проект",
            owner_id: session.user.id,
            description: "Основен проект",
          })
          .select("id")
          .single();

        if (!createError && newProject) {
          setCurrentProjectId(newProject.id);
        } else if (createError) {
          toast.error("Грешка при създаване на проект");
        }
      }
    };

    fetchOrCreateProject();
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
      const result = await inviteMember(selectedTeam.id, newMemberEmail, newMemberName, newMemberRole);
      if (result?.invitationUrl) {
        setInvitationLink(result.invitationUrl);
        toast.success("Линкът за покана е готов!");
      }
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("");
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("Линкът е копиран!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Грешка при копиране");
    }
  };

  const handleCloseInviteDialog = () => {
    setNewMemberOpen(false);
    setInvitationLink(null);
    setCopied(false);
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setUpdating(true);
    try {
      const result = await updateTeam(selectedTeam.id, editTeamName, editTeamDescription);
      if (result) {
        setEditTeamOpen(false);
        // Update the selected team locally
        setSelectedTeam({
          ...selectedTeam,
          name: editTeamName,
          description: editTeamDescription,
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const openEditDialog = () => {
    if (selectedTeam) {
      setEditTeamName(selectedTeam.name);
      setEditTeamDescription(selectedTeam.description || "");
      setEditTeamOpen(true);
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
        <div className="space-y-4 md:space-y-6">
          <Button variant="ghost" onClick={() => setSelectedTeam(null)} className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Назад</span>
          </Button>

          <div 
            className="rounded-xl p-4 md:p-8 relative"
            style={{ background: `linear-gradient(135deg, ${colors[teams.indexOf(selectedTeam) % colors.length]} 0%, ${colors[teams.indexOf(selectedTeam) % colors.length]}99 100%)` }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 md:top-4 md:right-4 text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
              onClick={openEditDialog}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <h1 className="text-xl md:text-3xl font-display font-bold text-white pr-10">
              {selectedTeam.name}
            </h1>
            {selectedTeam.description && (
              <p className="mt-1 md:mt-2 text-sm md:text-base text-white/80">{selectedTeam.description}</p>
            )}
            <div className="mt-3 md:mt-4 flex items-center gap-2">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-white" />
              <span className="text-sm text-white">{teamMembers.length} членове</span>
            </div>
          </div>

          {/* Edit Team Dialog */}
          <Dialog open={editTeamOpen} onOpenChange={setEditTeamOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Редактиране на екипа</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditTeam} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="editTeamName">Име на екипа</Label>
                  <Input
                    id="editTeamName"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    placeholder="Напр. Маркетинг екип"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTeamDescription">Описание</Label>
                  <Input
                    id="editTeamDescription"
                    value={editTeamDescription}
                    onChange={(e) => setEditTeamDescription(e.target.value)}
                    placeholder="Кратко описание на екипа..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditTeamOpen(false)}>
                    Отказ
                  </Button>
                  <Button 
                    type="submit" 
                    className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl"
                    disabled={updating}
                  >
                    {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Запази
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg md:text-xl font-display font-semibold">Членове</h2>
            <Dialog open={newMemberOpen} onOpenChange={(open) => {
              if (open) {
                setNewMemberOpen(true);
              } else {
                handleCloseInviteDialog();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg h-9 px-3">
                  <Mail className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Покани член</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Покани нов член</DialogTitle>
                </DialogHeader>
                
                {invitationLink ? (
                  <div className="space-y-4 mt-4">
                    <div className="rounded-lg bg-success/10 border border-success/20 p-4">
                      <p className="text-sm text-success font-medium mb-2">✓ Поканата е създадена!</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Копирайте линка и го изпратете на поканения:
                      </p>
                      <div className="flex gap-2">
                        <Input 
                          value={invitationLink} 
                          readOnly 
                          className="text-xs font-mono"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={handleCopyLink}
                        >
                          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setInvitationLink(null)}
                      >
                        Покани друг
                      </Button>
                      <Button 
                        type="button" 
                        className="gradient-primary text-primary-foreground"
                        onClick={handleCloseInviteDialog}
                      >
                        Готово
                      </Button>
                    </div>
                  </div>
                ) : (
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
                      <Button type="button" variant="outline" onClick={handleCloseInviteDialog}>
                        Отказ
                      </Button>
                      <Button 
                        type="submit" 
                        className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl"
                        disabled={inviting}
                      >
                        {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Създай линк за покана
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Team Members - Full width on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="glass-card rounded-xl p-3 md:p-4 animate-fade-in group relative">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-secondary shrink-0">
                    <UserCircle className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <h4 className="font-medium text-sm md:text-base truncate">
                        {member.profile?.full_name || member.email.split("@")[0]}
                      </h4>
                      <Badge variant={member.status === "accepted" ? "default" : "secondary"} className="text-[10px] md:text-xs shrink-0">
                        {member.status === "pending" ? "Чакащ" : "Приет"}
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{member.role}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
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
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">Екипи</h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Управлявайте екипите и членовете им
            </p>
          </div>
          <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg h-9 px-3">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Нов екип</span>
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
            <Users className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-lg md:text-xl font-semibold mb-2">Нямате екипи</h2>
            <p className="text-sm">Създайте първия си екип с бутона по-горе</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
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
