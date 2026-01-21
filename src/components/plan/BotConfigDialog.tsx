import { useState } from "react";
import { Bot, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AIBot } from "@/hooks/usePlanSteps";

interface BotConfigDialogProps {
  bots: AIBot[];
  projectId: string;
  onCreateBot: (bot: Omit<AIBot, 'id' | 'created_at' | 'updated_at'>) => Promise<AIBot | null>;
  onUpdateBot: (botId: string, updates: Partial<AIBot>) => Promise<boolean>;
  onDeleteBot: (botId: string) => Promise<boolean>;
}

const availableModels = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (бърз)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (балансиран)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (точен)" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro (нов)" },
];

export function BotConfigDialog({
  bots,
  projectId,
  onCreateBot,
  onUpdateBot,
  onDeleteBot,
}: BotConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<AIBot | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    model: "google/gemini-3-flash-preview",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      instructions: "",
      model: "google/gemini-3-flash-preview",
    });
    setEditingBot(null);
    setIsCreating(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.instructions.trim()) return;

    if (editingBot) {
      await onUpdateBot(editingBot.id, formData);
    } else {
      await onCreateBot({
        ...formData,
        project_id: projectId,
        avatar_url: null,
      });
    }
    resetForm();
  };

  const startEdit = (bot: AIBot) => {
    setEditingBot(bot);
    setFormData({
      name: bot.name,
      description: bot.description || "",
      instructions: bot.instructions,
      model: bot.model,
    });
    setIsCreating(true);
  };

  const handleDelete = async (botId: string) => {
    await onDeleteBot(botId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bot className="h-4 w-4" />
          Управление на ботове ({bots.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Ботове
          </DialogTitle>
          <DialogDescription>
            Създайте и конфигурирайте AI ботове с Gemini за автоматично генериране на съдържание
          </DialogDescription>
        </DialogHeader>

        {!isCreating ? (
          <div className="space-y-4">
            {/* Bot List */}
            {bots.length > 0 ? (
              <div className="space-y-3">
                {bots.map((bot) => (
                  <Card key={bot.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{bot.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {bot.description || "Няма описание"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Модел: {availableModels.find(m => m.value === bot.model)?.label || bot.model}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(bot)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(bot.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Все още нямате създадени ботове</p>
              </div>
            )}

            <Button
              onClick={() => setIsCreating(true)}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Създай нов бот
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-name">Име на бота *</Label>
              <Input
                id="bot-name"
                placeholder="напр. Маркетинг Експерт, Финансов Анализатор..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot-description">Описание</Label>
              <Input
                id="bot-description"
                placeholder="Кратко описание на бота"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bot-model">AI Модел</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
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
              <Label htmlFor="bot-instructions">Инструкции *</Label>
              <Textarea
                id="bot-instructions"
                placeholder="Опишете какво трябва да прави ботът, какъв стил да използва, какви данни да включва..."
                className="min-h-[150px]"
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Бъдете конкретни - опишете стил, формат, какви секции да включва, какъв тон да използва.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Отказ
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.instructions.trim()}
                className="flex-1"
              >
                {editingBot ? "Запази промените" : "Създай бот"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
