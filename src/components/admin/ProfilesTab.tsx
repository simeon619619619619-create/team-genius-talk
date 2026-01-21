import { useState } from "react";
import { Profile } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { bg } from "date-fns/locale";

interface ProfilesTabProps {
  profiles: Profile[];
  onUpdateProfile: (profileId: string, updates: Partial<Profile>) => Promise<boolean>;
  onDeleteProfile: (profileId: string) => Promise<boolean>;
}

export function ProfilesTab({ profiles, onUpdateProfile, onDeleteProfile }: ProfilesTabProps) {
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      instagram: profile.instagram || "",
    });
  };

  const handleSave = async () => {
    if (!editingProfile) return;
    const success = await onUpdateProfile(editingProfile.id, formData);
    if (success) {
      setEditingProfile(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await onDeleteProfile(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Потребителски профили
        </CardTitle>
        <CardDescription>
          Преглед и редакция на всички регистрирани потребители
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Потребител</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Instagram</TableHead>
              <TableHead>Регистриран</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.full_name?.charAt(0) || profile.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{profile.full_name || "Без име"}</span>
                  </div>
                </TableCell>
                <TableCell>{profile.email}</TableCell>
                <TableCell>{profile.phone || "-"}</TableCell>
                <TableCell>{profile.instagram || "-"}</TableCell>
                <TableCell>
                  {format(new Date(profile.created_at), "dd MMM yyyy", { locale: bg })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit Dialog */}
        <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактиране на профил</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Име</Label>
                <Input
                  value={formData.full_name || ""}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={formData.instagram || ""}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProfile(null)}>
                Отказ
              </Button>
              <Button onClick={handleSave}>Запази</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Изтриване на профил</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Сигурни ли сте, че искате да изтриете този профил? Това действие е необратимо.
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
