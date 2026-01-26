import { useState } from "react";
import { ChevronsUpDown, Building2, Plus, Check, User } from "lucide-react";
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
    canCreateOrganization 
  } = useOrganizations();
  const { profile } = useProfile();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const allOrganizations = [...organizations, ...memberOrganizations];
  const isOwner = profile?.user_type === "owner";

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
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Личен workspace</span>
              </div>
              {!currentOrganization && <Check className="h-4 w-4" />}
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
                  <span className="truncate">Личен workspace</span>
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
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Личен workspace</span>
              </div>
              {!currentOrganization && <Check className="h-4 w-4" />}
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
    </>
  );
}
