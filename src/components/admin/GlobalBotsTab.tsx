import { useState } from "react";
import { GlobalBot } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { BotAvatarUpload } from "@/components/plan/BotAvatarUpload";
interface GlobalBotsTabProps {
  bots: GlobalBot[];
  onUpdateBot: (botId: string, updates: Partial<GlobalBot>) => Promise<boolean>;
  onCreateBot: (bot: Omit<GlobalBot, 'id' | 'created_at' | 'updated_at'>) => Promise<GlobalBot | null>;
  onDeleteBot: (botId: string) => Promise<boolean>;
}

const stepKeyLabels: Record<string, string> = {
  business_summary: "Резюме на бизнеса",
  market_analysis: "Пазарен анализ",
  marketing_strategy: "Маркетинг стратегия",
  content_strategy: "Контент стратегия",
  operational_plan: "Оперативен план",
  financial_projections: "Финансови прогнози",
};

const availableModels = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (бърз)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (качествен)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (премиум)" },
];

export function GlobalBotsTab({ bots, onUpdateBot, onCreateBot, onDeleteBot }: GlobalBotsTabProps) {
  const [editingBot, setEditingBot] = useState<GlobalBot | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<GlobalBot>>({});

  const handleEdit = (bot: GlobalBot) => {
    setEditingBot(bot);
    setFormData({
      name: bot.name,
      description: bot.description || "",
      instructions: bot.instructions,
      model: bot.model,
      avatar_url: bot.avatar_url || "",
    });
  };

  const handleSave = async () => {
    if (!editingBot) return;
    const success = await onUpdateBot(editingBot.id, formData);
    if (success) {
      setEditingBot(null);
    }
  };

  const handleCreate = async () => {
    if (!formData.step_key || !formData.name || !formData.instructions) return;
    const result = await onCreateBot({
      step_key: formData.step_key,
      name: formData.name,
      description: formData.description || null,
      instructions: formData.instructions,
      model: formData.model || "google/gemini-3-flash-preview",
      avatar_url: formData.avatar_url || null,
    });
    if (result) {
      setShowCreateDialog(false);
      setFormData({});
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await onDeleteBot(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const openCreateDialog = () => {
    setFormData({
      step_key: "",
      name: "",
      description: "",
      instructions: "",
      model: "google/gemini-3-flash-preview",
      avatar_url: "",
    });
    setShowCreateDialog(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Глобални ботове
          </CardTitle>
          <CardDescription>
            Управление на AI ботове за всички стъпки от плана (скрити инструкции)
          </CardDescription>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Нов бот
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={bot.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{bot.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {stepKeyLabels[bot.step_key] || bot.step_key}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(bot)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(bot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {bot.description || "Без описание"}
                </p>
                <div className="p-2 bg-muted rounded text-xs font-mono max-h-20 overflow-hidden">
                  {bot.instructions.slice(0, 150)}...
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Модел: {availableModels.find(m => m.value === bot.model)?.label || bot.model}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingBot} onOpenChange={() => setEditingBot(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Редактиране на бот</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Име</Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Инструкции (скрити от потребителите)</Label>
                <Textarea
                  value={formData.instructions || ""}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Модел</Label>
                <Select
                  value={formData.model || "google/gemini-3-flash-preview"}
                  onValueChange={(value) => setFormData({ ...formData, model: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Аватар</Label>
                <BotAvatarUpload
                  currentUrl={formData.avatar_url || null}
                  onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
                  botName={formData.name || "Бот"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingBot(null)}>
                Отказ
              </Button>
              <Button onClick={handleSave}>Запази</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Създаване на нов бот</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Стъпка</Label>
                <Select
                  value={formData.step_key || ""}
                  onValueChange={(value) => setFormData({ ...formData, step_key: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Избери стъпка" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stepKeyLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Име</Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Инструкции (скрити от потребителите)</Label>
                <Textarea
                  value={formData.instructions || ""}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder="Напиши подробни инструкции за бота..."
                />
              </div>
              <div className="space-y-2">
                <Label>Модел</Label>
                <Select
                  value={formData.model || "google/gemini-3-flash-preview"}
                  onValueChange={(value) => setFormData({ ...formData, model: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Аватар</Label>
                <BotAvatarUpload
                  currentUrl={formData.avatar_url || null}
                  onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
                  botName={formData.name || "Бот"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Отказ
              </Button>
              <Button onClick={handleCreate}>Създай</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Изтриване на бот</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Сигурни ли сте, че искате да изтриете този бот?
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
