import { useState } from "react";
import { Plus, Sparkles, Loader2, Calendar, User, ArrowRight } from "lucide-react";
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
import { Team, TeamMember, Task } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Subtask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  order: number;
  assigneeId?: string;
  dueDate?: string;
  handoffTo?: string;
}

interface AITaskBreakdownDialogProps {
  teams: Team[];
  members: TeamMember[];
  onAddTasks: (tasks: Omit<Task, "id" | "createdAt">[]) => void;
}

export function AITaskBreakdownDialog({ teams, members, onAddTasks }: AITaskBreakdownDialogProps) {
  const [open, setOpen] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [step, setStep] = useState<"input" | "review">("input");

  const handleBreakDown = async () => {
    if (!taskDescription.trim()) {
      toast.error("Моля, въведете описание на задачата");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("break-down-task", {
        body: { 
          taskDescription,
          teamContext: `Налични екипи: ${teams.map(t => t.name).join(", ")}. Налични членове: ${members.map(m => `${m.name} (${m.role})`).join(", ")}`
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setSubtasks(data.subtasks.map((st: Subtask) => ({
        ...st,
        assigneeId: "",
        dueDate: "",
        handoffTo: ""
      })));
      setStep("review");
    } catch (error) {
      console.error("Error breaking down task:", error);
      toast.error("Грешка при разбиването на задачата. Моля, опитайте отново.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubtask = (index: number, field: keyof Subtask, value: string) => {
    setSubtasks(prev => prev.map((st, i) => 
      i === index ? { ...st, [field]: value } : st
    ));
  };

  const handleSubmit = () => {
    const invalidTasks = subtasks.filter(st => !st.assigneeId);
    if (invalidTasks.length > 0) {
      toast.error("Моля, изберете отговорник за всяка задача");
      return;
    }

    const tasksToAdd: Omit<Task, "id" | "createdAt">[] = subtasks.map(st => {
      const assignee = members.find(m => m.id === st.assigneeId);
      const team = teams.find(t => t.members.some(m => m.id === st.assigneeId));
      
      return {
        title: st.title,
        description: st.description + (st.handoffTo ? `\n\nПредай на: ${members.find(m => m.id === st.handoffTo)?.name || st.handoffTo}` : ""),
        status: "todo" as const,
        priority: st.priority,
        assigneeId: st.assigneeId!,
        teamId: team?.id || teams[0]?.id || "",
        dueDate: st.dueDate || undefined,
      };
    });

    onAddTasks(tasksToAdd);
    toast.success(`${tasksToAdd.length} задачи бяха създадени успешно!`);
    resetAndClose();
  };

  const resetAndClose = () => {
    setOpen(false);
    setTaskDescription("");
    setSubtasks([]);
    setStep("input");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetAndClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl gap-2">
          <Sparkles className="h-4 w-4" />
          AI Разбий задача
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === "input" ? "Разбий задача с AI" : "Прегледай и възложи задачи"}
          </DialogTitle>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="taskDesc">Опишете голямата задача</Label>
              <Textarea
                id="taskDesc"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Например: Трябва да създадем маркетинг кампания за нов продукт, включваща социални медии, имейл маркетинг и платени реклами..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                AI ще анализира задачата и ще я разбие на по-малки, изпълними действия.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Отказ
              </Button>
              <Button 
                onClick={handleBreakDown} 
                disabled={isLoading || !taskDescription.trim()}
                className="gradient-primary text-primary-foreground shadow-lg gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Анализиране...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Разбий с AI
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2">
            <p className="text-sm text-muted-foreground">
              AI генерира {subtasks.length} подзадачи. Прегледайте ги и задайте отговорник, краен срок и на кого да се предаде резултатът.
            </p>

            <div className="space-y-4">
              {subtasks.map((subtask, index) => (
                <div 
                  key={index} 
                  className="rounded-xl border border-border p-4 space-y-3 bg-card animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {subtask.order}
                        </span>
                        <h4 className="font-medium">{subtask.title}</h4>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{subtask.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded-full ${
                          subtask.priority === "high" ? "bg-destructive/10 text-destructive" :
                          subtask.priority === "medium" ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {subtask.priority === "high" ? "Високо" : subtask.priority === "medium" ? "Средно" : "Ниско"}
                        </span>
                        <span>~{subtask.estimatedHours}ч</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Отговорник *
                      </Label>
                      <Select 
                        value={subtask.assigneeId} 
                        onValueChange={(v) => updateSubtask(index, "assigneeId", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Избери" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Краен срок
                      </Label>
                      <Input
                        type="date"
                        className="h-9"
                        value={subtask.dueDate || ""}
                        onChange={(e) => updateSubtask(index, "dueDate", e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        Предай на
                      </Label>
                      <Select 
                        value={subtask.handoffTo || ""} 
                        onValueChange={(v) => updateSubtask(index, "handoffTo", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Избери" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-3 pt-4 pb-2 sticky bottom-0 bg-background">
              <Button type="button" variant="outline" onClick={() => setStep("input")}>
                ← Назад
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={resetAndClose}>
                  Отказ
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="gradient-primary text-primary-foreground shadow-lg"
                >
                  Създай {subtasks.length} задачи
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
