import { useState, useEffect } from "react";
import { Loader2, Building2, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
}

interface UnassignedProject {
  id: string;
  name: string;
}

interface DataMigrationDialogProps {
  organizations: Organization[];
  open: boolean;
  onComplete: () => void;
}

export function DataMigrationDialog({
  organizations,
  open,
  onComplete,
}: DataMigrationDialogProps) {
  const { user } = useAuth();
  const [unassignedProjects, setUnassignedProjects] = useState<UnassignedProject[]>([]);
  const [orphanedTasksCount, setOrphanedTasksCount] = useState(0);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    const fetchUnassignedData = async () => {
      if (!user || !open) return;

      try {
        // Fetch unassigned projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name")
          .eq("owner_id", user.id)
          .is("organization_id", null);

        if (projectsError) throw projectsError;
        setUnassignedProjects(projectsData || []);

        // Fetch count of orphaned tasks (tasks without project_id)
        const { count, error: tasksError } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("project_id", null);

        if (tasksError) throw tasksError;
        setOrphanedTasksCount(count || 0);
      } catch (error) {
        console.error("Error fetching unassigned data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnassignedData();
  }, [user, open]);

  // Auto-select first organization if only one exists
  useEffect(() => {
    if (organizations.length === 1 && !selectedOrg) {
      setSelectedOrg(organizations[0].id);
    }
  }, [organizations, selectedOrg]);

  const handleMigrate = async () => {
    if (!selectedOrg) return;

    setMigrating(true);
    try {
      // First, get or create project for the selected organization
      let targetProjectId: string;

      const { data: existingProject } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", selectedOrg)
        .eq("owner_id", user!.id)
        .limit(1)
        .maybeSingle();

      if (existingProject) {
        targetProjectId = existingProject.id;
      } else {
        // Get org name for project naming
        const selectedOrgData = organizations.find(o => o.id === selectedOrg);
        const { data: newProject, error: createError } = await supabase
          .from("projects")
          .insert({
            name: `Проект на ${selectedOrgData?.name || "Организация"}`,
            owner_id: user!.id,
            organization_id: selectedOrg,
            description: "Основен проект",
          })
          .select()
          .single();

        if (createError) throw createError;
        targetProjectId = newProject.id;
      }

      // Update all unassigned projects to belong to the selected organization
      if (unassignedProjects.length > 0) {
        const projectIds = unassignedProjects.map((p) => p.id);
        
        const { error } = await supabase
          .from("projects")
          .update({ organization_id: selectedOrg })
          .in("id", projectIds);

        if (error) throw error;
      }

      // Update all orphaned tasks to belong to the target project
      if (orphanedTasksCount > 0) {
        const { error: tasksError } = await supabase
          .from("tasks")
          .update({ project_id: targetProjectId })
          .eq("user_id", user!.id)
          .is("project_id", null);

        if (tasksError) throw tasksError;
      }

      setMigrated(true);
      toast.success("Данните са успешно прехвърлени!");
      
      // Wait a moment before closing
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Error migrating data:", error);
      toast.error("Грешка при прехвърляне на данните");
    } finally {
      setMigrating(false);
    }
  };

  // Check if there's anything to migrate
  const hasDataToMigrate = unassignedProjects.length > 0 || orphanedTasksCount > 0;

  if (loading) {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Don't show if nothing to migrate
  if (!hasDataToMigrate) {
    onComplete();
    return null;
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Прехвърляне на съществуващи данни
          </DialogTitle>
          <DialogDescription>
            Имате съществуващи данни. Изберете в коя организация да бъдат прехвърлени.
          </DialogDescription>
        </DialogHeader>

        {migrated ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <p className="text-center text-muted-foreground">
              Данните са прехвърлени успешно!
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Show what will be migrated */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Данни за прехвърляне:
              </Label>
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                {unassignedProjects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">{unassignedProjects.length} проект(а) с планове и екипи</span>
                  </div>
                )}
                {orphanedTasksCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-warning" />
                    <span className="text-sm">{orphanedTasksCount} задачи без проект</span>
                  </div>
                )}
              </div>
            </div>

            {/* Organization selection */}
            <div className="space-y-2">
              <Label htmlFor="org-select">Изберете организация</Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger id="org-select">
                  <SelectValue placeholder="Изберете организация..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action button */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={handleMigrate}
                disabled={!selectedOrg || migrating}
                className="gradient-primary text-primary-foreground gap-2"
              >
                {migrating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Прехвърли
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
