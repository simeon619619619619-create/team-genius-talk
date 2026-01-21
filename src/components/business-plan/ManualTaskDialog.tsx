import { useState } from "react";
import { Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";

interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  isCompleted: boolean;
  taskType?: "project" | "strategy" | "action";
}

interface ManualTaskDialogProps {
  task?: WeeklyTask;
  onSave: (task: Omit<WeeklyTask, "id" | "isCompleted"> & { id?: string }) => void;
  trigger?: React.ReactNode;
}

const dayOptions = [
  { value: "1", label: "Понеделник" },
  { value: "2", label: "Вторник" },
  { value: "3", label: "Сряда" },
  { value: "4", label: "Четвъртък" },
  { value: "5", label: "Петък" },
  { value: "6", label: "Събота" },
  { value: "7", label: "Неделя" },
];

const priorityOptions = [
  { value: "high", label: "Висок" },
  { value: "medium", label: "Среден" },
  { value: "low", label: "Нисък" },
];

const typeOptions = [
  { value: "project", label: "Проект" },
  { value: "strategy", label: "Стратегия" },
  { value: "action", label: "Действие" },
];

export function ManualTaskDialog({ task, onSave, trigger }: ManualTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task?.priority || "medium");
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours?.toString() || "1");
  const [dayOfWeek, setDayOfWeek] = useState(task?.dayOfWeek?.toString() || "1");
  const [taskType, setTaskType] = useState<"project" | "strategy" | "action">(task?.taskType || "action");

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Моля, въведете заглавие");
      return;
    }

    onSave({
      id: task?.id,
      title: title.trim(),
      description: description.trim(),
      priority,
      estimatedHours: parseFloat(estimatedHours) || 1,
      dayOfWeek: parseInt(dayOfWeek),
      taskType,
    });

    if (!task) {
      // Reset form for new task
      setTitle("");
      setDescription("");
      setPriority("medium");
      setEstimatedHours("1");
      setDayOfWeek("1");
      setTaskType("action");
    }

    setOpen(false);
    toast.success(task ? "Задачата е обновена" : "Задачата е добавена");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setEstimatedHours(task.estimatedHours.toString());
      setDayOfWeek(task.dayOfWeek.toString());
      setTaskType(task.taskType || "action");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Добави задача
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {task ? "Редактирай задача" : "Нова задача"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Заглавие</label>
            <Input
              placeholder="Въведете заглавие"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Описание</label>
            <Textarea
              placeholder="Описание на задачата"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ден</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Тип</label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as typeof taskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Приоритет</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Часове</label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отказ
            </Button>
            <Button onClick={handleSave}>
              {task ? "Запази" : "Добави"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
