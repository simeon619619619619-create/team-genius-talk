import { useState } from "react";
import { UserWithSub } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Search, Crown, Pencil } from "lucide-react";
import { format } from "date-fns";
import { bg } from "date-fns/locale";

interface SubscriptionsTabProps {
  users: UserWithSub[];
  onUpdateSubscription: (userId: string, planType: string, status: string) => Promise<boolean>;
}

const planColors: Record<string, string> = {
  lifetime: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  yearly: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  monthly: "bg-green-500/10 text-green-600 border-green-500/20",
  free: "bg-secondary text-muted-foreground",
};

const planLabels: Record<string, string> = {
  lifetime: "Lifetime",
  yearly: "Yearly",
  monthly: "Monthly",
  free: "Безплатен",
};

const statusLabels: Record<string, string> = {
  active: "Активен",
  canceled: "Отказан",
  past_due: "Просрочен",
  trialing: "Пробен",
};

export function SubscriptionsTab({ users, onUpdateSubscription }: SubscriptionsTabProps) {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<UserWithSub | null>(null);
  const [editPlan, setEditPlan] = useState("free");
  const [editStatus, setEditStatus] = useState("active");

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase());

    const userPlan = u.subscription?.plan_type || "free";
    const matchPlan = filterPlan === "all" || userPlan === filterPlan;

    return matchSearch && matchPlan;
  });

  const handleEdit = (user: UserWithSub) => {
    setEditingUser(user);
    setEditPlan(user.subscription?.plan_type || "free");
    setEditStatus(user.subscription?.status || "active");
  };

  const handleSave = async () => {
    if (!editingUser) return;
    const success = await onUpdateSubscription(editingUser.user_id, editPlan, editStatus);
    if (success) setEditingUser(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Абонаменти и потребители
        </CardTitle>
        <CardDescription>
          Управление на потребителски абонаменти
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Търси по име или email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Всички планове" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички планове</SelectItem>
              <SelectItem value="lifetime">Lifetime</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="free">Безплатни</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground">{filtered.length} потребители</p>

        {/* Table */}
        <div className="rounded-xl border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Потребител</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>План</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Регистриран</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(user => {
                const plan = user.subscription?.plan_type || "free";
                const status = user.subscription?.status || "—";
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{user.full_name || "Без име"}</span>
                          {plan === "lifetime" && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={planColors[plan] || ""}>
                        {planLabels[plan] || plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{statusLabels[status] || status}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "dd MMM yyyy", { locale: bg })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Няма намерени потребители
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редакция на абонамент</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={editingUser.avatar_url || undefined} />
                  <AvatarFallback>{editingUser.full_name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editingUser.full_name || "Без име"}</p>
                  <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>План</Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Безплатен</SelectItem>
                    <SelectItem value="monthly">Monthly ($10.99)</SelectItem>
                    <SelectItem value="yearly">Yearly ($79.99)</SelectItem>
                    <SelectItem value="lifetime">Lifetime ($239.99)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="trialing">Пробен период</SelectItem>
                    <SelectItem value="canceled">Отказан</SelectItem>
                    <SelectItem value="past_due">Просрочен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Отказ</Button>
            <Button onClick={handleSave}>Запази</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
