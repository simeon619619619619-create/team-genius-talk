import { useState } from "react";
import { Plus, Users, UserCircle, ArrowLeft, Trash2, UserPlus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { mockTeams, mockMembers } from "@/data/mockData";
import { Team, TeamMember } from "@/types";
import { toast } from "sonner";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [members, setMembers] = useState<TeamMember[]>(mockMembers);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [addExistingMemberOpen, setAddExistingMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // New team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamManager, setNewTeamManager] = useState("");

  // New member form state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberManagerId, setNewMemberManagerId] = useState("");

  // Add existing member state
  const [selectedExistingMember, setSelectedExistingMember] = useState("");

  const colors = [
    "hsl(221, 83%, 53%)",
    "hsl(174, 72%, 46%)",
    "hsl(262, 83%, 58%)",
    "hsl(25, 95%, 53%)",
    "hsl(142, 71%, 45%)",
  ];

  const handleAddTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const newTeam: Team = {
      id: Date.now().toString(),
      name: newTeamName,
      description: newTeamDescription,
      managerId: newTeamManager,
      members: [members.find(m => m.id === newTeamManager)!],
      color: colors[teams.length % colors.length],
    };
    setTeams([...teams, newTeam]);
    setNewTeamOpen(false);
    setNewTeamName("");
    setNewTeamDescription("");
    setNewTeamManager("");
    toast.success("Екипът е създаден успешно!");
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: newMemberName,
      email: newMemberEmail,
      role: newMemberRole,
      managerId: newMemberManagerId || undefined,
    };
    setMembers([...members, newMember]);
    
    if (selectedTeam) {
      const updatedTeam = { ...selectedTeam, members: [...selectedTeam.members, newMember] };
      setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
      setSelectedTeam(updatedTeam);
    }
    
    setNewMemberOpen(false);
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberRole("");
    setNewMemberManagerId("");
    toast.success("Членът е добавен успешно!");
  };

  const handleAddExistingMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedExistingMember) return;

    const memberToAdd = members.find(m => m.id === selectedExistingMember);
    if (!memberToAdd) return;

    // Check if already in team
    if (selectedTeam.members.some(m => m.id === memberToAdd.id)) {
      toast.error("Този член вече е в екипа!");
      return;
    }

    const updatedTeam = { ...selectedTeam, members: [...selectedTeam.members, memberToAdd] };
    setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
    setSelectedTeam(updatedTeam);
    
    setAddExistingMemberOpen(false);
    setSelectedExistingMember("");
    toast.success(`${memberToAdd.name} е добавен към екипа!`);
  };

  const handleRemoveMember = () => {
    if (!selectedTeam || !memberToRemove) return;

    // Can't remove the manager
    if (memberToRemove.id === selectedTeam.managerId) {
      toast.error("Не можете да премахнете мениджъра на екипа!");
      setMemberToRemove(null);
      return;
    }

    const updatedMembers = selectedTeam.members.filter(m => m.id !== memberToRemove.id);
    const updatedTeam = { ...selectedTeam, members: updatedMembers };
    
    setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
    setSelectedTeam(updatedTeam);
    
    toast.success(`${memberToRemove.name} е премахнат от екипа!`);
    setMemberToRemove(null);
  };

  const managers = members.filter(m => !m.managerId);

  // Get members not in the current team
  const availableMembers = selectedTeam 
    ? members.filter(m => !selectedTeam.members.some(tm => tm.id === m.id))
    : [];

  if (selectedTeam) {
    const manager = selectedTeam.members.find(m => m.id === selectedTeam.managerId);
    const teamMembers = selectedTeam.members.filter(m => m.id !== selectedTeam.managerId);

    return (
      <MainLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setSelectedTeam(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад към екипите
          </Button>

          <div 
            className="rounded-xl p-8"
            style={{ background: `linear-gradient(135deg, ${selectedTeam.color} 0%, ${selectedTeam.color}99 100%)` }}
          >
            <h1 className="text-3xl font-display font-bold text-primary-foreground">
              {selectedTeam.name}
            </h1>
            <p className="mt-2 text-primary-foreground/80">{selectedTeam.description}</p>
            <div className="mt-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-foreground" />
              <span className="text-primary-foreground">{selectedTeam.members.length} членове</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Членове на екипа</h2>
            <div className="flex gap-2">
              {/* Add Existing Member Dialog */}
              <Dialog open={addExistingMemberOpen} onOpenChange={setAddExistingMemberOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={availableMembers.length === 0}>
                    <UserPlus className="h-4 w-4" />
                    Добави съществуващ
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Добави съществуващ член</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddExistingMember} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Изберете член</Label>
                      <Select value={selectedExistingMember} onValueChange={setSelectedExistingMember}>
                        <SelectTrigger>
                          <SelectValue placeholder="Изберете член..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} - {member.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setAddExistingMemberOpen(false)}>
                        Отказ
                      </Button>
                      <Button type="submit" className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl" disabled={!selectedExistingMember}>
                        Добави
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Add New Member Dialog */}
              <Dialog open={newMemberOpen} onOpenChange={setNewMemberOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Нов член
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Добавяне на нов член</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddMember} className="space-y-4 mt-4">
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
                    <div className="space-y-2">
                      <Label>Отговорник (мениджър)</Label>
                      <Select value={newMemberManagerId} onValueChange={setNewMemberManagerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Изберете мениджър" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={selectedTeam.managerId}>
                            {manager?.name}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setNewMemberOpen(false)}>
                        Отказ
                      </Button>
                      <Button type="submit" className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl">
                        Добави
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Team Hierarchy */}
          <div className="space-y-4">
            {/* Manager */}
            {manager && (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary">
                    <UserCircle className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      Мениджър на екипа
                    </span>
                    <h3 className="mt-2 text-xl font-display font-bold">{manager.name}</h3>
                    <p className="text-muted-foreground">{manager.role}</p>
                    <p className="text-sm text-muted-foreground">{manager.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="glass-card rounded-xl p-4 animate-fade-in group relative">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{member.name}</h4>
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
                <p>Няма други членове в екипа</p>
                <p className="text-sm">Добавете членове с бутоните по-горе</p>
              </div>
            )}
          </div>
        </div>

        {/* Remove Member Confirmation */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Премахване на член</AlertDialogTitle>
              <AlertDialogDescription>
                Сигурни ли сте, че искате да премахнете <strong>{memberToRemove?.name}</strong> от екипа?
                Това действие може да бъде отменено по-късно.
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
                    placeholder="Опишете целите на екипа..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Мениджър на екипа</Label>
                  <Select value={newTeamManager} onValueChange={setNewTeamManager} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Изберете мениджър" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} - {manager.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onSelect={setSelectedTeam} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
