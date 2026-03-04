import { useState } from "react";
import { UserRole, Profile } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Trash2, Plus } from "lucide-react";

interface RolesTabProps {
  roles: UserRole[];
  profiles: Profile[];
  onAddRole: (userId: string, projectId: string, role: UserRole['role']) => Promise<UserRole | null>;
  onUpdateRole: (roleId: string, newRole: UserRole['role']) => Promise<boolean>;
  onDeleteRole: (roleId: string) => Promise<boolean>;
}

const roleLabels: Record<UserRole['role'], string> = {
  admin: "Администратор",
  owner: "Собственик",
  editor: "Редактор",
  viewer: "Наблюдател",
};

const roleColors: Record<UserRole['role'], string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  owner: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  editor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  viewer: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function RolesTab({ roles, profiles, onAddRole, onUpdateRole, onDeleteRole }: RolesTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState({
    userId: "",
    projectId: "",
    role: "viewer" as UserRole['role'],
  });

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const handleAddRole = async () => {
    if (!newRole.userId || !newRole.projectId) return;
    const result = await onAddRole(newRole.userId, newRole.projectId, newRole.role);
    if (result) {
      setShowAddDialog(false);
      setNewRole({ userId: "", projectId: "", role: "viewer" });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await onDeleteRole(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Потребителски роли
          </CardTitle>
          <CardDescription>
            Управление на права и роли за всички потребители
          </CardDescription>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добави роля
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Потребител</TableHead>
              <TableHead>Проект ID</TableHead>
              <TableHead>Роля</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  {getProfileName(role.user_id)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {role.project_id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  <Select
                    value={role.role}
                    onValueChange={(value) => onUpdateRole(role.id, value as UserRole['role'])}
                  >
                    <SelectTrigger className="w-40">
                      <Badge variant="outline" className={roleColors[role.role]}>
                        {roleLabels[role.role]}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleLabels) as UserRole['role'][]).map((r) => (
                        <SelectItem key={r} value={r}>
                          <Badge variant="outline" className={roleColors[r]}>
                            {roleLabels[r]}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(role.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Add Role Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавяне на роля</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Потребител</Label>
                <Select
                  value={newRole.userId}
                  onValueChange={(value) => setNewRole({ ...newRole, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Избери потребител" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.full_name || profile.email || profile.user_id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Проект ID</Label>
                <Input
                  value={newRole.projectId}
                  onChange={(e) => setNewRole({ ...newRole, projectId: e.target.value })}
                  placeholder="UUID на проекта"
                />
              </div>
              <div className="space-y-2">
                <Label>Роля</Label>
                <Select
                  value={newRole.role}
                  onValueChange={(value) => setNewRole({ ...newRole, role: value as UserRole['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleLabels) as UserRole['role'][]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabels[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Отказ
              </Button>
              <Button onClick={handleAddRole}>Добави</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Изтриване на роля</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Сигурни ли сте, че искате да изтриете тази роля?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                Отказ
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Изтрий
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
