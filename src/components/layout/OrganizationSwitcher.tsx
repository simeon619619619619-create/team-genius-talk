import { useState } from "react";
import { ChevronsUpDown, Building2, Plus, Check, User, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { useOrganizations, Organization } from "@/hooks/useOrganizations";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OrganizationSwitcherProps {
  collapsed?: boolean;
}

export function OrganizationSwitcher({ collapsed = false }: OrganizationSwitcherProps) {
  const { 
    organizations, 
    memberOrganizations, 
    currentOrganization, 
    switchOrganization, 
    createOrganization,
    updateOrganization,
    deleteOrganization,
    canCreateOrganization 
  } = useOrganizations();
  const { profile, updateProfile } = useProfile();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showWorkspaceEditDialog, setShowWorkspaceEditDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [editOrgName, setEditOrgName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const allOrganizations = [...organizations, ...memberOrganizations];
  const isOwner = profile?.user_type === "owner";
  const personalWorkspaceName = profile?.workspace_name || "Личен workspace";

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      toast.error("Моля, въведете име");
      return;
    }

    setIsCreating(true);
    try {
      const org = await createOrganization(newOrgName.trim());
      if (org) {
        toast.success("Организацията е създадена");
        setShowCreateDialog(false);
        setNewOrgName("");
        switchOrganization(org);
      } else {
        toast.error("Грешка при създаване");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditOrganization = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrg(org);
    setEditOrgName(org.name);
    setShowEditDialog(true);
  };

  const handleEditWorkspace = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceName(personalWorkspaceName);
    setShowWorkspaceEditDialog(true);
  };

  const handleUpdateOrganization = async () => {
    if (!editingOrg || !editOrgName.trim()) {
      toast.error("Моля, въведете име");
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateOrganization(editingOrg.id, editOrgName.trim());
      if (success) {
        toast.success("Организацията е обновена");
        setShowEditDialog(false);
        setEditingOrg(null);
        setEditOrgName("");
      } else {
        toast.error("Грешка при обновяване");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!deletingOrg) return;

    setIsDeleting(true);
    try {
      const success = await deleteOrganization(deletingOrg.id);
      if (success) {
        toast.success("Организацията е изтрита");
        setShowDeleteDialog(false);
        setDeletingOrg(null);
      } else {
        toast.error("Грешка при изтриване");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingOrg(org);
    setShowDeleteDialog(true);
  };

  const handleUpdateWorkspaceName = async () => {
    if (!workspaceName.trim()) {
      toast.error("Моля, въведете име");
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateProfile({ workspace_name: workspaceName.trim() });
      if (success) {
        toast.success("Името е обновено");
        setShowWorkspaceEditDialog(false);
        setWorkspaceName("");
      } else {
        toast.error("Грешка при обновяване");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't show switcher if user is a worker with no orgs
  if (!isOwner && allOrganizations.length === 0) {
    return null;
  }

  // Show personal workspace option for workers
  const showPersonalWorkspace = !isOwner;

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            {currentOrganization ? (
              <Building2 className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Превключване</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {showPersonalWorkspace && (
            <DropdownMenuItem
              onClick={() => switchOrganization(null)}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{personalWorkspaceName}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleEditWorkspace(e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {!currentOrganization && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
          )}
          
          {allOrganizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => switchOrganization(org)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{org.name}</span>
              </div>
              {currentOrganization?.id === org.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          
          {isOwner && canCreateOrganization() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Нова организация
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-10 px-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              {currentOrganization ? (
                <>
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{currentOrganization.name}</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{personalWorkspaceName}</span>
                </>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <DropdownMenuLabel>Организации</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {showPersonalWorkspace && (
            <DropdownMenuItem
              onClick={() => switchOrganization(null)}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{personalWorkspaceName}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleEditWorkspace(e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-opacity"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {!currentOrganization && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
          )}
          
          {organizations.length > 0 && isOwner && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Мои организации ({organizations.length}/3)
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org)}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{org.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleEditOrganization(org, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded transition-opacity"
                      title="Преименувай"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => openDeleteDialog(org, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 text-destructive rounded transition-opacity"
                      title="Изтрий"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    {currentOrganization?.id === org.id && <Check className="h-4 w-4" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {memberOrganizations.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Член на
              </DropdownMenuLabel>
              {memberOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{org.name}</span>
                  </div>
                  {currentOrganization?.id === org.id && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          {isOwner && canCreateOrganization() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Нова организация
              </DropdownMenuItem>
            </>
          )}
          
          {isOwner && !canCreateOrganization() && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Достигнахте лимита от 3 организации
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нова организация</DialogTitle>
            <DialogDescription>
              Създайте нова организация и поканете членове на екипа си.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Име на организацията"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateOrganization()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отказ
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isCreating}>
              {isCreating ? "Създаване..." : "Създай"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирай организация</DialogTitle>
            <DialogDescription>
              Променете името на организацията.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Име на организацията"
              value={editOrgName}
              onChange={(e) => setEditOrgName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateOrganization()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Отказ
            </Button>
            <Button onClick={handleUpdateOrganization} disabled={isUpdating}>
              {isUpdating ? "Запазване..." : "Запази"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceEditDialog} onOpenChange={setShowWorkspaceEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирай workspace</DialogTitle>
            <DialogDescription>
              Променете името на личния си workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Име на workspace"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateWorkspaceName()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkspaceEditDialog(false)}>
              Отказ
            </Button>
            <Button onClick={handleUpdateWorkspaceName} disabled={isUpdating}>
              {isUpdating ? "Запазване..." : "Запази"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтриване на организация</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете организацията "{deletingOrg?.name}"? 
              Това действие е необратимо и ще премахне всички членове от организацията.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отказ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Изтриване..." : "Изтрий"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
