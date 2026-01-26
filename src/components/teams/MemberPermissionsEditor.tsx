import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export interface MemberPermissions {
  can_view_tasks: boolean;
  can_view_business_plan: boolean;
  can_view_annual_plan: boolean;
  can_view_all: boolean;
}

interface MemberPermissionsEditorProps {
  teamMemberId?: string;
  permissions?: MemberPermissions;
  onChange: (permissions: MemberPermissions) => void;
  loading?: boolean;
}

const defaultPermissions: MemberPermissions = {
  can_view_tasks: false,
  can_view_business_plan: false,
  can_view_annual_plan: false,
  can_view_all: false,
};

export function MemberPermissionsEditor({
  teamMemberId,
  permissions: externalPermissions,
  onChange,
  loading: externalLoading,
}: MemberPermissionsEditorProps) {
  const [permissions, setPermissions] = useState<MemberPermissions>(
    externalPermissions || defaultPermissions
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (externalPermissions) {
      setPermissions(externalPermissions);
    }
  }, [externalPermissions]);

  useEffect(() => {
    if (teamMemberId && !externalPermissions) {
      fetchPermissions();
    }
  }, [teamMemberId]);

  const fetchPermissions = async () => {
    if (!teamMemberId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("member_permissions")
        .select("*")
        .eq("team_member_id", teamMemberId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const perms: MemberPermissions = {
          can_view_tasks: data.can_view_tasks,
          can_view_business_plan: data.can_view_business_plan,
          can_view_annual_plan: data.can_view_annual_plan,
          can_view_all: data.can_view_all,
        };
        setPermissions(perms);
        onChange(perms);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof MemberPermissions, value: boolean) => {
    let newPermissions = { ...permissions, [key]: value };

    // If "all" is toggled on, enable all others
    if (key === "can_view_all" && value) {
      newPermissions = {
        can_view_tasks: true,
        can_view_business_plan: true,
        can_view_annual_plan: true,
        can_view_all: true,
      };
    }

    // If "all" is on and any individual is turned off, turn off "all"
    if (key !== "can_view_all" && !value && permissions.can_view_all) {
      newPermissions.can_view_all = false;
    }

    // Check if all individual permissions are on, then enable "all"
    if (
      newPermissions.can_view_tasks &&
      newPermissions.can_view_business_plan &&
      newPermissions.can_view_annual_plan &&
      !newPermissions.can_view_all
    ) {
      newPermissions.can_view_all = true;
    }

    setPermissions(newPermissions);
    onChange(newPermissions);
  };

  const isLoading = loading || externalLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Права на достъп</Label>
      <div className="space-y-3 rounded-lg border p-4 bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="all" className="text-sm font-medium">
              Всички секции
            </Label>
            <p className="text-xs text-muted-foreground">
              Пълен достъп до приложението
            </p>
          </div>
          <Switch
            id="all"
            checked={permissions.can_view_all}
            onCheckedChange={(checked) => handleChange("can_view_all", checked)}
          />
        </div>

        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tasks" className="text-sm">
                Задачи
              </Label>
              <p className="text-xs text-muted-foreground">
                Достъп до задачи и дневен план
              </p>
            </div>
            <Switch
              id="tasks"
              checked={permissions.can_view_tasks}
              onCheckedChange={(checked) =>
                handleChange("can_view_tasks", checked)
              }
              disabled={permissions.can_view_all}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="business_plan" className="text-sm">
                Бизнес план
              </Label>
              <p className="text-xs text-muted-foreground">
                Достъп до генерирания бизнес план
              </p>
            </div>
            <Switch
              id="business_plan"
              checked={permissions.can_view_business_plan}
              onCheckedChange={(checked) =>
                handleChange("can_view_business_plan", checked)
              }
              disabled={permissions.can_view_all}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="annual_plan" className="text-sm">
                Годишен план
              </Label>
              <p className="text-xs text-muted-foreground">
                Достъп до седмични задачи и тримесечен план
              </p>
            </div>
            <Switch
              id="annual_plan"
              checked={permissions.can_view_annual_plan}
              onCheckedChange={(checked) =>
                handleChange("can_view_annual_plan", checked)
              }
              disabled={permissions.can_view_all}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
