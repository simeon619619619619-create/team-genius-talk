import { useState } from "react";
import { PromoCode } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Ticket, Plus, Trash2, Copy } from "lucide-react";
import { format } from "date-fns";
import { bg } from "date-fns/locale";
import { toast } from "sonner";

interface PromoCodesTabProps {
  promoCodes: PromoCode[];
  onCreatePromo: (code: string, description: string, grantsLifetime: boolean, maxUses: number | null, expiresAt: string | null) => Promise<PromoCode | null>;
  onTogglePromo: (id: string, active: boolean) => Promise<void>;
  onDeletePromo: (id: string) => Promise<void>;
}

export function PromoCodesTab({ promoCodes, onCreatePromo, onTogglePromo, onDeletePromo }: PromoCodesTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLifetime, setNewLifetime] = useState(true);
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newExpires, setNewExpires] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newCode.trim()) {
      toast.error("Моля, въведете код");
      return;
    }
    const result = await onCreatePromo(
      newCode.trim(),
      newDesc.trim(),
      newLifetime,
      newMaxUses ? parseInt(newMaxUses) : null,
      newExpires || null
    );
    if (result) {
      setShowCreate(false);
      setNewCode("");
      setNewDesc("");
      setNewMaxUses("");
      setNewExpires("");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`"${code}" копиран`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Промо кодове
            </CardTitle>
            <CardDescription>
              Създаване и управление на ваучери и промоционални кодове
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Нов код
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Използвания</TableHead>
                <TableHead>Изтича</TableHead>
                <TableHead>Активен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map(promo => (
                <TableRow key={promo.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold bg-secondary px-2 py-1 rounded">
                        {promo.code}
                      </code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(promo.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{promo.description || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={promo.grants_lifetime_access ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" : "bg-blue-500/10 text-blue-600"}>
                      {promo.grants_lifetime_access ? "Lifetime" : "Отстъпка"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {promo.current_uses}{promo.max_uses ? ` / ${promo.max_uses}` : " / неогр."}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {promo.expires_at
                      ? format(new Date(promo.expires_at), "dd MMM yyyy", { locale: bg })
                      : "Без срок"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={promo.is_active}
                      onCheckedChange={checked => onTogglePromo(promo.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(promo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {promoCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Няма промо кодове
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нов промо код</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Код</Label>
              <Input
                placeholder="SUMMER2026"
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                placeholder="Лятна промоция..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium text-sm">Дава Lifetime достъп</p>
                <p className="text-xs text-muted-foreground">Потребителят получава пълен безсрочен достъп</p>
              </div>
              <Switch checked={newLifetime} onCheckedChange={setNewLifetime} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Макс. използвания</Label>
                <Input
                  type="number"
                  placeholder="Неограничени"
                  value={newMaxUses}
                  onChange={e => setNewMaxUses(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Изтича на</Label>
                <Input
                  type="date"
                  value={newExpires}
                  onChange={e => setNewExpires(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отказ</Button>
            <Button onClick={handleCreate}>Създай</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изтриване на промо код</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Сигурни ли сте? Това действие е необратимо.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Отказ</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) await onDeletePromo(deleteId);
              setDeleteId(null);
            }}>Изтрий</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
