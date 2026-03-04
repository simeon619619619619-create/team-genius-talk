import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectTeamMembers } from "@/hooks/useProjectTeamMembers";

interface AddTaskDialogProps {
  onAddTask: (task: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    assignee_name?: string;
    team_name?: string;
    due_date?: string;
  }) => void;
}

export function AddTaskDialog({ onAddTask }: AddTaskDialogProps) {
  const { members: teamMembers } = useProjectTeamMembers();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assigneeName, setAssigneeName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask({
      title,
      description: description || undefined,
      priority,
      assignee_name: assigneeName || undefined,
      team_name: teamName || undefined,
      due_date: dueDate || undefined,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssigneeName("");
    setTeamName("");
    setDueDate("");
  };

  const getMemberDisplayName = (member: { full_name: string | null; email: string }) => {
    return member.full_name || member.email;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          Нова задача
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">Добавяне на нова задача</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Заглавие</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напишете заглавие..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишете задачата..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Екип</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Напр. Маркетинг"
              />
            </div>

            <div className="space-y-2">
              <Label>Отговорник</Label>
              {teamMembers.length > 0 ? (
                <Select value={assigneeName} onValueChange={setAssigneeName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Избери от екипа" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={getMemberDisplayName(member)}>
                        {getMemberDisplayName(member)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Напр. Иван Петров"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Нисък</SelectItem>
                  <SelectItem value="medium">Среден</SelectItem>
                  <SelectItem value="high">Висок</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Краен срок</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl dark:border-border/50 dark:hover:bg-accent/50">
              Отказ
            </Button>
            <Button type="submit" className="gradient-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-200">
              Добави задача
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
