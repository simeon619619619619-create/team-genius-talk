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
import { ProjectTeamMember } from "@/hooks/useProjectTeamMembers";

interface AddSubtaskDialogProps {
  teamMembers: ProjectTeamMember[];
  onAddSubtask: (subtask: { title: string; assigneeId: string; dueDate?: string; handoffTo?: string }) => void;
}

export function AddSubtaskDialog({ teamMembers, onAddSubtask }: AddSubtaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [handoffTo, setHandoffTo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onAddSubtask({
      title,
      assigneeId: assigneeName,
      dueDate: dueDate || undefined,
      handoffTo: handoffTo || undefined,
    });

    setOpen(false);
    setTitle("");
    setDescription("");
    setAssigneeName("");
    setDueDate("");
    setHandoffTo("");
  };

  const getMemberDisplayName = (member: ProjectTeamMember) => {
    return member.full_name || member.email;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
          <Plus className="h-3 w-3" />
          Подзадача
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Добавяне на подзадача</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="subtaskTitle">Заглавие</Label>
            <Input
              id="subtaskTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напр. Проучване на конкуренцията"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtaskDesc">Описание (по избор)</Label>
            <Textarea
              id="subtaskDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишете какво трябва да се направи..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Възложи на</Label>
            {teamMembers.length > 0 ? (
              <Select value={assigneeName} onValueChange={setAssigneeName}>
                <SelectTrigger>
                  <SelectValue placeholder="Избери член от екипа" />
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
                placeholder="Напр. Мария Иванова"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtaskDueDate">Краен срок</Label>
            <Input
              id="subtaskDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Предай на (след завършване)</Label>
            {teamMembers.length > 0 ? (
              <Select value={handoffTo} onValueChange={setHandoffTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Избери член от екипа" />
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
                value={handoffTo}
                onChange={(e) => setHandoffTo(e.target.value)}
                placeholder="Напр. Георги Димитров"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отказ
            </Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">
              Добави
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
