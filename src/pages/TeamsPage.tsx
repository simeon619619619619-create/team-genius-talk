import { useState, useEffect, useCallback } from "react";
import { Plus, Users, UserCircle, ArrowLeft, Trash2, UserPlus, Loader2, Pencil, Copy, Check, Settings, Bot } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useTeams, TeamWithMembers, DbTeamMember } from "@/hooks/useTeams";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { useOrganizationProjects } from "@/hooks/useOrganizationProjects";
import { toast } from "sonner";
import { Team, TeamMember } from "@/types";
import { MemberPermissionsEditor, MemberPermissions } from "@/components/teams/MemberPermissionsEditor";
import { useMemberPermissions } from "@/hooks/useMemberPermissions";
import { VirtualOffice, type AiBot } from "@/components/teams/VirtualOffice";
import { AiBotCard } from "@/components/teams/AiBotCard";
import { Textarea } from "@/components/ui/textarea";

export default function TeamsPage() {
  const { user } = useAuth();
  const { projectId: currentProjectId, loading: projectLoading } = useCurrentProject();
  const { teams, loading, createTeam, updateTeam, createMemberDirectly, removeMember, refreshTeams } = useTeams(currentProjectId);
  const { projects: orgProjects, loading: projectsLoading } = useOrganizationProjects();
  const { savePermissions, getPermissions, loading: permissionsLoading } = useMemberPermissions();
  
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<DbTeamMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);

  // Permission editing state
  const [editPermissionsOpen, setEditPermissionsOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<DbTeamMember | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<MemberPermissions | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // ─── AI BOTS STATE ───
  const AI_BOTS_KEY = "simora_ai_bots";
  const DEFAULT_AI_BOTS: AiBot[] = [
    { id: "bot-1", name: "Елена", role: "Уеб Разработчик", process: "eufashioninstitute.com", frequency: "24/7", automations: ["Deploy", "SEO Check", "Build"], tasks: [], taskGroups: [
      { id: "tg-1a", title: "Поддръжка на сайта", subtasks: [
        { id: "st-1a1", text: "Проверка за грешки в конзолата", done: false },
        { id: "st-1a2", text: "Оптимизация на скоростта", done: false },
        { id: "st-1a3", text: "Актуализация на съдържанието", done: false },
      ]},
    ], skinColor: "#f5c6a0", hairColor: "#4a2810", shirtColor: "#818cf8", state: "working" },
    { id: "bot-2", name: "Мария", role: "Email & Комуникации", process: "Resend Notifications", frequency: "При заявка", automations: ["Apply Forms", "Book Forms", "Newsletter"], tasks: [], taskGroups: [
      { id: "tg-2a", title: "Обработка на формуляри", subtasks: [
        { id: "st-2a1", text: "Проверка за нови кандидатури", done: false },
        { id: "st-2a2", text: "Изпращане на потвърждения", done: false },
        { id: "st-2a3", text: "Обработка на booking заявки", done: false },
      ]},
    ], skinColor: "#f0b88a", hairColor: "#1a0a00", shirtColor: "#f472b6", state: "working" },
    { id: "bot-3", name: "Ивана", role: "Съдържание & Соц. Мрежи", process: "Content Pipeline", frequency: "3 пъти/ден", automations: ["Posts", "Stories", "Reels Script"], tasks: [], taskGroups: [
      { id: "tg-3a", title: "Създаване на съдържание", subtasks: [
        { id: "st-3a1", text: "Планиране на месечен контент календар", done: false },
        { id: "st-3a2", text: "Снимане/заснемане на Reels (3-5 бр./седмица)", done: false },
        { id: "st-3a3", text: "Подготовка на Stories (ежедневни)", done: false },
        { id: "st-3a4", text: "Дизайн на карусел постове (2 бр./седмица)", done: false },
        { id: "st-3a5", text: "Написване на copywriting за всеки пост", done: false },
      ]},
    ], skinColor: "#f5d0b0", hairColor: "#8b4513", shirtColor: "#34d399", state: "idle" },
    { id: "bot-4", name: "Софи", role: "Модел Мениджмънт", process: "Model Database", frequency: "При нужда", automations: ["Profiles", "Photos", "Casting"], tasks: [], taskGroups: [
      { id: "tg-4a", title: "Управление на профили", subtasks: [
        { id: "st-4a1", text: "Обновяване на портфолио снимки", done: false },
        { id: "st-4a2", text: "Организиране на кастинги", done: false },
      ]},
    ], skinColor: "#f0c8a0", hairColor: "#2c1608", shirtColor: "#fbbf24", state: "idle" },
    { id: "bot-5", name: "Дара", role: "Анализи & Мониторинг", process: "Site Monitoring", frequency: "На всеки 24ч", automations: ["Uptime", "Performance", "Reports"], tasks: [], taskGroups: [
      { id: "tg-5a", title: "Проверка на сайта", subtasks: [
        { id: "st-5a1", text: "Мониторинг на uptime", done: false },
        { id: "st-5a2", text: "Проверка на Core Web Vitals", done: false },
        { id: "st-5a3", text: "Седмичен доклад", done: false },
      ]},
    ], skinColor: "#e8b898", hairColor: "#660000", shirtColor: "#60a5fa", state: "idle" },
    { id: "bot-6", name: "Лина", role: "Продажби & Клиенти", process: "Social Empire", frequency: "При нужда", automations: ["Stripe", "Leads", "Follow-up"], tasks: [], taskGroups: [
      { id: "tg-6a", title: "Обработка на поръчки", subtasks: [
        { id: "st-6a1", text: "Проверка на Stripe плащания", done: false },
        { id: "st-6a2", text: "Следване на лийдове", done: false },
        { id: "st-6a3", text: "Follow-up имейли", done: false },
      ]},
    ], skinColor: "#f5c8b0", hairColor: "#3d1c02", shirtColor: "#fb923c", state: "idle" },
  ];

  const [aiBots, setAiBots] = useState<AiBot[]>(() => {
    try {
      const saved = localStorage.getItem(AI_BOTS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_AI_BOTS;
    } catch {
      return DEFAULT_AI_BOTS;
    }
  });
  const [selectedAiBot, setSelectedAiBot] = useState<string | null>(null);
  const [aiBotModalOpen, setAiBotModalOpen] = useState(false);
  const [editingAiBot, setEditingAiBot] = useState<AiBot | null>(null);

  // AI Bot form state
  const [abName, setAbName] = useState("");
  const [abRole, setAbRole] = useState("");
  const [abProcess, setAbProcess] = useState("");
  const [abFrequency, setAbFrequency] = useState("");
  const [abAutomations, setAbAutomations] = useState("");
  const [abTasks, setAbTasks] = useState("");
  const [abShirt, setAbShirt] = useState("#818cf8");
  const [abHair, setAbHair] = useState("#4a2810");
  const [abSkin, setAbSkin] = useState("#f5c6a0");

  const saveAiBots = useCallback((bots: AiBot[]) => {
    setAiBots(bots);
    localStorage.setItem(AI_BOTS_KEY, JSON.stringify(bots));
  }, []);

  const openAiBotModal = (bot?: AiBot) => {
    if (bot) {
      setEditingAiBot(bot);
      setAbName(bot.name);
      setAbRole(bot.role);
      setAbProcess(bot.process);
      setAbFrequency(bot.frequency);
      setAbAutomations(bot.automations.join(", "));
      setAbTasks(bot.tasks.join("\n"));
      setAbShirt(bot.shirtColor);
      setAbHair(bot.hairColor);
      setAbSkin(bot.skinColor);
    } else {
      setEditingAiBot(null);
      setAbName(""); setAbRole(""); setAbProcess(""); setAbFrequency("");
      setAbAutomations(""); setAbTasks("");
      setAbShirt("#818cf8"); setAbHair("#4a2810"); setAbSkin("#f5c6a0");
    }
    setAiBotModalOpen(true);
  };

  const handleSaveAiBot = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AiBot = {
      id: editingAiBot?.id || "bot-" + Date.now(),
      name: abName,
      role: abRole,
      process: abProcess,
      frequency: abFrequency,
      automations: abAutomations.split(",").map(s => s.trim()).filter(Boolean),
      tasks: abTasks.split("\n").map(s => s.trim()).filter(Boolean),
      shirtColor: abShirt,
      hairColor: abHair,
      skinColor: abSkin,
      state: editingAiBot?.state || "idle",
    };
    if (editingAiBot) {
      saveAiBots(aiBots.map(b => b.id === editingAiBot.id ? data : b));
    } else {
      saveAiBots([...aiBots, data]);
    }
    setAiBotModalOpen(false);
    toast.success(editingAiBot ? "Ботът е обновен!" : "Ботът е добавен!");
  };

  const handleUpdateAiBot = (updated: AiBot) => {
    saveAiBots(aiBots.map(b => b.id === updated.id ? updated : b));
  };

  const handleDeleteAiBot = (id: string) => {
    saveAiBots(aiBots.filter(b => b.id !== id));
    toast.success("Ботът е изтрит");
  };

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
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [newMemberPermissions, setNewMemberPermissions] = useState<MemberPermissions>({
    can_view_tasks: false,
    can_view_business_plan: false,
    can_view_annual_plan: false,
    can_view_all: false,
  });

  const colors = [
    "hsl(221, 83%, 53%)",
    "hsl(174, 72%, 46%)",
    "hsl(262, 83%, 58%)",
    "hsl(25, 95%, 53%)",
    "hsl(142, 71%, 45%)",
  ];

  // Note: Project is now managed by useCurrentProject hook

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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setAdding(true);
    try {
      const result = await createMemberDirectly(
        selectedTeam.id,
        newMemberName,
        newMemberRole,
        newMemberEmail || undefined,
        selectedProjectIds.length > 0 ? selectedProjectIds : undefined
      );
      if (result) {
        if (result.memberId) {
          await savePermissions(result.memberId, newMemberPermissions);
          setCreatedMemberId(result.memberId);
        }
        setAccessLink(result.accessLink || null);
        setEmailSent(!!(result as any).emailSent);
        setCreatedEmail((result as any).memberEmail || null);
        toast.success(
          (result as any).emailSent
            ? "Поканата е изпратена на имейла!"
            : "Членът е добавен успешно!"
        );
      }
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("");
      setSelectedProjectIds([]);
      setNewMemberPermissions({
        can_view_tasks: false,
        can_view_business_plan: false,
        can_view_annual_plan: false,
        can_view_all: false,
      });
    } finally {
      setAdding(false);
    }
  };

  const handleCopyLink = async () => {
    if (!accessLink) return;
    try {
      await navigator.clipboard.writeText(accessLink);
      setCopied(true);
      toast.success("Линкът е копиран!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Грешка при копиране");
    }
  };

  const handleCloseAddDialog = () => {
    setNewMemberOpen(false);
    setAccessLink(null);
    setEmailSent(false);
    setCreatedEmail(null);
    setCreatedMemberId(null);
    setCopied(false);
  };

  const openEditPermissions = async (member: DbTeamMember) => {
    setEditingMember(member);
    const perms = await getPermissions(member.id);
    setEditingPermissions(perms || {
      can_view_tasks: false,
      can_view_business_plan: false,
      can_view_annual_plan: false,
      can_view_all: false,
    });
    setEditPermissionsOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!editingMember || !editingPermissions) return;
    
    setSavingPermissions(true);
    try {
      const success = await savePermissions(editingMember.id, editingPermissions);
      if (success) {
        toast.success("Правата са запазени!");
        setEditPermissionsOpen(false);
        setEditingMember(null);
        setEditingPermissions(null);
      }
    } finally {
      setSavingPermissions(false);
    }
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

  if (loading || projectLoading) {
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
                handleCloseAddDialog();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg h-9 px-3">
                  <UserPlus className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Добави член</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Добавяне на член</DialogTitle>
                </DialogHeader>
                
                {accessLink || emailSent ? (
                  <div className="space-y-4 mt-4">
                    <div className="rounded-lg bg-success/10 border border-success/20 p-4">
                      <p className="text-sm text-success font-medium mb-2">✓ Членът е добавен!</p>

                      {emailSent && createdEmail && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Изпратена е покана на <strong>{createdEmail}</strong>.
                          При отваряне на линка от имейла ще зададе парола и ще влезе директно.
                        </p>
                      )}

                      {accessLink && (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">
                            {emailSent ? "Или споделете този линк директно:" : "Споделете този линк с члена:"}
                          </p>
                          <div className="flex gap-2">
                            <Input
                              value={accessLink}
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
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setAccessLink(null); setEmailSent(false); setCreatedEmail(null); }}
                      >
                        Добави друг
                      </Button>
                      <Button
                        type="button"
                        className="gradient-primary text-primary-foreground"
                        onClick={handleCloseAddDialog}
                      >
                        Готово
                      </Button>
                    </div>
                  </div>
                ) : (
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
                        placeholder="email@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Имейлът на члена — ще получи линк за достъп
                      </p>
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

                    {/* Project Access Selector */}
                    {orgProjects.length > 1 && (
                      <div className="space-y-2">
                        <Label>Достъп до проекти</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Членът автоматично получава достъп до текущия проект. Изберете допълнителни проекти:
                        </p>
                        <div className="space-y-2 rounded-lg border p-3 bg-secondary/30 max-h-40 overflow-y-auto">
                          {orgProjects
                            .filter(p => p.id !== currentProjectId) // Exclude current project
                            .map((project) => (
                              <div key={project.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`project-${project.id}`}
                                  checked={selectedProjectIds.includes(project.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedProjectIds([...selectedProjectIds, project.id]);
                                    } else {
                                      setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                                    }
                                  }}
                                />
                                <Label 
                                  htmlFor={`project-${project.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {project.name}
                                </Label>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    <MemberPermissionsEditor
                      permissions={newMemberPermissions}
                      onChange={setNewMemberPermissions}
                    />
                    
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseAddDialog}>
                        Отказ
                      </Button>
                      <Button 
                        type="submit" 
                        className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl"
                        disabled={adding}
                      >
                        {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Добави член
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
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPermissions(member);
                      }}
                      title="Редактирай права"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
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

        {/* Edit Permissions Dialog */}
        <Dialog open={editPermissionsOpen} onOpenChange={(open) => {
          if (!open) {
            setEditPermissionsOpen(false);
            setEditingMember(null);
            setEditingPermissions(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                Редактиране на права - {editingMember?.profile?.full_name || editingMember?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {editingPermissions && (
                <MemberPermissionsEditor
                  permissions={editingPermissions}
                  onChange={setEditingPermissions}
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditPermissionsOpen(false)}
              >
                Отказ
              </Button>
              <Button 
                type="button" 
                className="gradient-primary text-primary-foreground"
                onClick={handleSavePermissions}
                disabled={savingPermissions}
              >
                {savingPermissions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Запази
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

        {/* ─── AI VIRTUAL OFFICE ─── */}
        <div className="pt-4 md:pt-8 border-t border-border mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-display font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                AI Екип
              </h2>
              <p className="text-sm text-muted-foreground hidden md:block">
                Виртуални асистенти и техните автоматизации
              </p>
            </div>
            <Button
              size="sm"
              className="gradient-primary text-primary-foreground shadow-lg h-9 px-3"
              onClick={() => openAiBotModal()}
            >
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Нов бот</span>
            </Button>
          </div>

          <VirtualOffice
            bots={aiBots}
            selectedBotId={selectedAiBot}
            onSelectBot={setSelectedAiBot}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {aiBots.map((bot) => (
              <AiBotCard
                key={bot.id}
                bot={bot}
                onEdit={openAiBotModal}
                onDelete={handleDeleteAiBot}
                onUpdate={handleUpdateAiBot}
              />
            ))}
          </div>
        </div>

        {/* ─── AI BOT MODAL ─── */}
        <Dialog open={aiBotModalOpen} onOpenChange={setAiBotModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingAiBot ? "Редактирай бот" : "Нов бот"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAiBot} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ab-name">Име</Label>
                  <Input id="ab-name" value={abName} onChange={e => setAbName(e.target.value)} placeholder="Елена" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ab-role">Роля</Label>
                  <Input id="ab-role" value={abRole} onChange={e => setAbRole(e.target.value)} placeholder="Уеб Разработчик" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ab-process">Процес</Label>
                  <Input id="ab-process" value={abProcess} onChange={e => setAbProcess(e.target.value)} placeholder="eufashioninstitute.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ab-freq">Честота</Label>
                  <Input id="ab-freq" value={abFrequency} onChange={e => setAbFrequency(e.target.value)} placeholder="На всеки 24ч" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-auto">Автоматизации</Label>
                <Input id="ab-auto" value={abAutomations} onChange={e => setAbAutomations(e.target.value)} placeholder="Deploy, SEO Check, Build" />
                <p className="text-[11px] text-muted-foreground">Разделени със запетая</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-tasks">Задачи</Label>
                <Textarea id="ab-tasks" value={abTasks} onChange={e => setAbTasks(e.target.value)} placeholder={"Поддръжка на сайта\nОптимизация"} rows={3} />
                <p className="text-[11px] text-muted-foreground">Всяка задача на нов ред</p>
              </div>
              <div className="space-y-1.5">
                <Label>Визуализация</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={abShirt} onChange={e => setAbShirt(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">Блуза</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={abHair} onChange={e => setAbHair(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">Коса</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={abSkin} onChange={e => setAbSkin(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs text-muted-foreground">Кожа</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setAiBotModalOpen(false)}>
                  Отказ
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground shadow-lg">
                  {editingAiBot ? "Запази" : "Добави"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
