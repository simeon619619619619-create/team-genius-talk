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
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    const fetchUnassignedProjects = async () => {
      if (!user || !open) return;

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name")
          .eq("owner_id", user.id)
          .is("organization_id", null);

        if (error) throw error;
        setUnassignedProjects(data || []);
      } catch (error) {
        console.error("Error fetching unassigned projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnassignedProjects();
  }, [user, open]);

  // Auto-select first organization if only one exists
  useEffect(() => {
    if (organizations.length === 1 && !selectedOrg) {
      setSelectedOrg(organizations[0].id);
    }
  }, [organizations, selectedOrg]);

  const handleMigrate = async () => {
    if (!selectedOrg || unassignedProjects.length === 0) return;

    setMigrating(true);
    try {
      // Update all unassigned projects to belong to the selected organization
      const projectIds = unassignedProjects.map((p) => p.id);
      
      const { error } = await supabase
        .from("projects")
        .update({ organization_id: selectedOrg })
        .in("id", projectIds);

      if (error) throw error;

      setMigrated(true);
      toast.success("Данните са успешно прехвърлени!");
      
      // Wait a moment before closing
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Error migrating projects:", error);
      toast.error("Грешка при прехвърляне на данните");
    } finally {
      setMigrating(false);
    }
  };

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

  // Don't show if no unassigned projects
  if (unassignedProjects.length === 0) {
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
            Имате съществуващи планове и проекти. Изберете в коя организация да бъдат прехвърлени.
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
            {/* Show projects to migrate */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">
                Проекти за прехвърляне ({unassignedProjects.length}):
              </Label>
              <div className="rounded-lg border border-border bg-secondary/30 p-3 max-h-32 overflow-y-auto">
                {unassignedProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-2 py-1">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">{project.name}</span>
                  </div>
                ))}
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
