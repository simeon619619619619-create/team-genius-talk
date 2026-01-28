import { useState, useEffect, useCallback } from "react";
import { Plus, Save, ChevronDown, ChevronUp, Target, Briefcase, Zap, BarChart3, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { QuarterWeeksView } from "@/components/business-plan/QuarterWeeksView";
import { useCurrentProject } from "@/hooks/useCurrentProject";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Goal {
  id: string;
  title: string;
  description: string;
  category: "revenue" | "growth" | "efficiency" | "innovation" | "other";
  priority: "high" | "medium" | "low";
  status: "not_started" | "in_progress" | "completed";
}

interface PlanItem {
  id: string;
  type: "project" | "strategy" | "action";
  title: string;
  description: string;
  owner: string;
  deadline: string;
  expectedResults: string;
  status: "planned" | "in_progress" | "completed" | "delayed";
  priority: "high" | "medium" | "low";
}

interface WeeklyTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedHours: number;
  dayOfWeek: number;
  isCompleted: boolean;
}

interface QuarterPlan {
  goals: Goal[];
  items: PlanItem[];
  notes: string;
  weeklyTasks: Record<number, WeeklyTask[]>;
}

interface BusinessPlan {
  year: number;
  annualGoals: Goal[];
  annualItems: PlanItem[];
  quarters: {
    Q1: QuarterPlan;
    Q2: QuarterPlan;
    Q3: QuarterPlan;
    Q4: QuarterPlan;
  };
}

const emptyQuarter: QuarterPlan = {
  goals: [],
  items: [],
  notes: "",
  weeklyTasks: {},
};

const initialPlan: BusinessPlan = {
  year: new Date().getFullYear(),
  annualGoals: [],
  annualItems: [],
  quarters: {
    Q1: { ...emptyQuarter },
    Q2: { ...emptyQuarter },
    Q3: { ...emptyQuarter },
    Q4: { ...emptyQuarter },
  },
};

const categoryOptions = [
  { value: "revenue", label: "Приходи" },
  { value: "growth", label: "Растеж" },
  { value: "efficiency", label: "Ефективност" },
  { value: "innovation", label: "Иновации" },
  { value: "other", label: "Друго" },
];

const priorityOptions = [
  { value: "high", label: "Висок" },
  { value: "medium", label: "Среден" },
  { value: "low", label: "Нисък" },
];

const statusOptions = [
  { value: "not_started", label: "Незапочнат" },
  { value: "in_progress", label: "В процес" },
  { value: "completed", label: "Завършен" },
];

const itemStatusOptions = [
  { value: "planned", label: "Планиран" },
  { value: "in_progress", label: "В процес" },
  { value: "completed", label: "Завършен" },
  { value: "delayed", label: "Забавен" },
];

const itemTypeOptions = [
  { value: "project", label: "Проект" },
  { value: "strategy", label: "Стратегия" },
  { value: "action", label: "Действие" },
];

function GoalForm({
  onAdd,
  onCancel,
}: {
  onAdd: (goal: Omit<Goal, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Goal["category"]>("revenue");
  const [priority, setPriority] = useState<Goal["priority"]>("medium");

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Моля, въведете заглавие на целта");
      return;
    }
    onAdd({
      title,
      description,
      category,
      priority,
      status: "not_started",
    });
    setTitle("");
    setDescription("");
    setCategory("revenue");
    setPriority("medium");
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <Input
          placeholder="Заглавие на целта"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Описание (свободен текст)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Категория</label>
            <Select value={category} onValueChange={(v) => setCategory(v as Goal["category"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Приоритет</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Goal["priority"])}>
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
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Отказ
          </Button>
          <Button onClick={handleSubmit}>Добави цел</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (item: Omit<PlanItem, "id">) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<PlanItem["type"]>("project");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [expectedResults, setExpectedResults] = useState("");
  const [priority, setPriority] = useState<PlanItem["priority"]>("medium");

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Моля, въведете заглавие");
      return;
    }
    onAdd({
      type,
      title,
      description,
      owner,
      deadline,
      expectedResults,
      status: "planned",
      priority,
    });
    setType("project");
    setTitle("");
    setDescription("");
    setOwner("");
    setDeadline("");
    setExpectedResults("");
    setPriority("medium");
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Тип</label>
            <Select value={type} onValueChange={(v) => setType(v as PlanItem["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Приоритет</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as PlanItem["priority"])}>
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
        </div>
        <Input
          placeholder="Заглавие"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Описание (свободен текст)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Отговорник"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <Input
            type="date"
            placeholder="Краен срок"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <Textarea
          placeholder="Очаквани резултати (свободен текст)"
          value={expectedResults}
          onChange={(e) => setExpectedResults(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Отказ
          </Button>
          <Button onClick={handleSubmit}>Добави</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCard({
  goal,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  onUpdate: (goal: Goal) => void;
  onDelete: () => void;
}) {
  const priorityColors = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-warning/10 text-warning",
    low: "bg-muted text-muted-foreground",
  };

  const categoryLabels: Record<Goal["category"], string> = {
    revenue: "Приходи",
    growth: "Растеж",
    efficiency: "Ефективност",
    innovation: "Иновации",
    other: "Друго",
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityColors[goal.priority])}>
                {priorityOptions.find((p) => p.value === goal.priority)?.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {categoryLabels[goal.category]}
              </span>
            </div>
            <h4 className="font-medium text-foreground">{goal.title}</h4>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={goal.status}
              onValueChange={(v) => onUpdate({ ...goal, status: v as Goal["status"] })}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 text-destructive"
              onClick={onDelete}
            >
              ✕
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanItemCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: PlanItem;
  onUpdate: (item: PlanItem) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-warning/10 text-warning",
    low: "bg-muted text-muted-foreground",
  };

  const typeIcons = {
    project: Briefcase,
    strategy: Target,
    action: Zap,
  };

  const typeLabels = {
    project: "Проект",
    strategy: "Стратегия",
    action: "Действие",
  };

  const Icon = typeIcons[item.type];

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", item.type === "project" ? "bg-primary/10 text-primary" : item.type === "strategy" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">{typeLabels[item.type]}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityColors[item.priority])}>
                {priorityOptions.find((p) => p.value === item.priority)?.label}
              </span>
            </div>
            <h4 className="font-medium text-foreground">{item.title}</h4>
            {item.owner && (
              <p className="text-xs text-muted-foreground mt-1">Отговорник: {item.owner}</p>
            )}
            {item.deadline && (
              <p className="text-xs text-muted-foreground">Срок: {new Date(item.deadline).toLocaleDateString("bg-BG")}</p>
            )}
            
            {expanded && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {item.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Описание:</p>
                    <p className="text-sm text-foreground">{item.description}</p>
                  </div>
                )}
                {item.expectedResults && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Очаквани резултати:</p>
                    <p className="text-sm text-foreground">{item.expectedResults}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={item.status}
              onValueChange={(v) => onUpdate({ ...item, status: v as PlanItem["status"] })}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8 p-0"
              onClick={onDelete}
            >
              ✕
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanSection({
  title,
  icon: Icon,
  goals,
  items,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: {
  title: string;
  icon: React.ElementType;
  goals: Goal[];
  items: PlanItem[];
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onAddItem: (item: Omit<PlanItem, "id">) => void;
  onUpdateItem: (item: PlanItem) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Goals Section */}
      <Card className="border-border/50 dark:border-border/30 bg-gradient-to-br from-card to-card/90 dark:from-card/90 dark:to-card/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Цели
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoalForm(true)}
              className="gap-1 dark:border-border/50 dark:hover:bg-accent/50"
            >
              <Plus className="h-4 w-4" />
              Добави цел
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showGoalForm && (
            <GoalForm
              onAdd={(goal) => {
                onAddGoal(goal);
                setShowGoalForm(false);
              }}
              onCancel={() => setShowGoalForm(false)}
            />
          )}
          {goals.length === 0 && !showGoalForm && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Няма добавени цели
            </p>
          )}
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={onUpdateGoal}
              onDelete={() => onDeleteGoal(goal.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Projects/Strategies/Actions Section */}
      <Card className="border-border/50 dark:border-border/30 bg-gradient-to-br from-card to-card/90 dark:from-card/90 dark:to-card/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Проекти / Стратегии / Действия
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowItemForm(true)}
              className="gap-1 dark:border-border/50 dark:hover:bg-accent/50"
            >
              <Plus className="h-4 w-4" />
              Добави
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showItemForm && (
            <PlanItemForm
              onAdd={(item) => {
                onAddItem(item);
                setShowItemForm(false);
              }}
              onCancel={() => setShowItemForm(false)}
            />
          )}
          {items.length === 0 && !showItemForm && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Няма добавени елементи
            </p>
          )}
          {items.map((item) => (
            <PlanItemCard
              key={item.id}
              item={item}
              onUpdate={onUpdateItem}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BusinessPlanPage() {
  const { projectId, loading: projectLoading } = useCurrentProject();
  const [plan, setPlan] = useState<BusinessPlan>(initialPlan);
  const [activeTab, setActiveTab] = useState("annual");
  const [isLoading, setIsLoading] = useState(true);
  const [dbPlanId, setDbPlanId] = useState<string | null>(null);

  const generateId = () => crypto.randomUUID();

  // Load business plan from database
  const loadBusinessPlan = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("business_plans")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setDbPlanId(data.id);
        
        // Parse the stored data back into our format
        const annualGoals = Array.isArray(data.annual_goals) ? (data.annual_goals as unknown as Goal[]) : [];
        const q1Items = Array.isArray(data.q1_items) ? (data.q1_items as unknown as PlanItem[]) : [];
        const q2Items = Array.isArray(data.q2_items) ? (data.q2_items as unknown as PlanItem[]) : [];
        const q3Items = Array.isArray(data.q3_items) ? (data.q3_items as unknown as PlanItem[]) : [];
        const q4Items = Array.isArray(data.q4_items) ? (data.q4_items as unknown as PlanItem[]) : [];

        setPlan({
          year: data.year,
          annualGoals,
          annualItems: [],
          quarters: {
            Q1: { ...emptyQuarter, items: q1Items },
            Q2: { ...emptyQuarter, items: q2Items },
            Q3: { ...emptyQuarter, items: q3Items },
            Q4: { ...emptyQuarter, items: q4Items },
          },
        });
      }
    } catch (error) {
      console.error("Error loading business plan:", error);
      toast.error("Грешка при зареждане на бизнес плана");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadBusinessPlan();
  }, [loadBusinessPlan]);

  // Annual handlers
  const handleAddAnnualGoal = (goal: Omit<Goal, "id">) => {
    setPlan((prev) => ({
      ...prev,
      annualGoals: [...prev.annualGoals, { ...goal, id: generateId() }],
    }));
    toast.success("Годишната цел е добавена");
  };

  const handleUpdateAnnualGoal = (goal: Goal) => {
    setPlan((prev) => ({
      ...prev,
      annualGoals: prev.annualGoals.map((g) => (g.id === goal.id ? goal : g)),
    }));
  };

  const handleDeleteAnnualGoal = (id: string) => {
    setPlan((prev) => ({
      ...prev,
      annualGoals: prev.annualGoals.filter((g) => g.id !== id),
    }));
    toast.success("Целта е изтрита");
  };

  const handleAddAnnualItem = (item: Omit<PlanItem, "id">) => {
    setPlan((prev) => ({
      ...prev,
      annualItems: [...prev.annualItems, { ...item, id: generateId() }],
    }));
    toast.success("Елементът е добавен");
  };

  const handleUpdateAnnualItem = (item: PlanItem) => {
    setPlan((prev) => ({
      ...prev,
      annualItems: prev.annualItems.map((i) => (i.id === item.id ? item : i)),
    }));
  };

  const handleDeleteAnnualItem = (id: string) => {
    setPlan((prev) => ({
      ...prev,
      annualItems: prev.annualItems.filter((i) => i.id !== id),
    }));
    toast.success("Елементът е изтрит");
  };

  // Quarter handlers
  const handleAddQuarterGoal = (quarter: keyof BusinessPlan["quarters"], goal: Omit<Goal, "id">) => {
    setPlan((prev) => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          goals: [...prev.quarters[quarter].goals, { ...goal, id: generateId() }],
        },
      },
    }));
    toast.success("Целта е добавена");
  };

  const handleUpdateQuarterGoal = (quarter: keyof BusinessPlan["quarters"], goal: Goal) => {
    setPlan((prev) => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          goals: prev.quarters[quarter].goals.map((g) => (g.id === goal.id ? goal : g)),
        },
      },
    }));
  };

  const handleDeleteQuarterGoal = (quarter: keyof BusinessPlan["quarters"], id: string) => {
    setPlan((prev) => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          goals: prev.quarters[quarter].goals.filter((g) => g.id !== id),
        },
      },
    }));
    toast.success("Целта е изтрита");
  };

  const handleAddQuarterItem = (quarter: keyof BusinessPlan["quarters"], item: Omit<PlanItem, "id">) => {
    setPlan((prev) => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          items: [...prev.quarters[quarter].items, { ...item, id: generateId() }],
        },
      },
    }));
    toast.success("Елементът е добавен");
  };

  const handleUpdateQuarterItem = (quarter: keyof BusinessPlan["quarters"], item: PlanItem) => {
    setPlan((prev) => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          items: prev.quarters[quarter].items.map((i) => (i.id === item.id ? item : i)),
        },
      },
    }));
  };

  const handleDeleteQuarterItem = (quarter: keyof BusinessPlan["quarters"], id: string) => {
    setPlan((prev) => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          items: prev.quarters[quarter].items.filter((i) => i.id !== id),
        },
      },
    }));
    toast.success("Елементът е изтрит");
  };

  const handleSave = () => {
    // TODO: Save to database
    toast.success("Планът е запазен");
  };

  const totalGoals = plan.annualGoals.length + 
    plan.quarters.Q1.goals.length + 
    plan.quarters.Q2.goals.length + 
    plan.quarters.Q3.goals.length + 
    plan.quarters.Q4.goals.length;

  const totalItems = plan.annualItems.length +
    plan.quarters.Q1.items.length +
    plan.quarters.Q2.items.length +
    plan.quarters.Q3.items.length +
    plan.quarters.Q4.items.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Бизнес план {plan.year}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Годишни и тримесечни цели, проекти, стратегии и действия
            </p>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Запази
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 dark:border-border/30 bg-gradient-to-br from-card to-card/80 dark:from-card/80 dark:to-card/40 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 dark:bg-primary/20 ring-1 ring-primary/20">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalGoals}</p>
                  <p className="text-xs text-muted-foreground">Общо цели</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 dark:border-border/30 bg-gradient-to-br from-card to-card/80 dark:from-card/80 dark:to-card/40 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success/15 dark:bg-success/20 ring-1 ring-success/20">
                  <Briefcase className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {plan.annualItems.filter((i) => i.type === "project").length +
                      plan.quarters.Q1.items.filter((i) => i.type === "project").length +
                      plan.quarters.Q2.items.filter((i) => i.type === "project").length +
                      plan.quarters.Q3.items.filter((i) => i.type === "project").length +
                      plan.quarters.Q4.items.filter((i) => i.type === "project").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Проекти</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 dark:border-border/30 bg-gradient-to-br from-card to-card/80 dark:from-card/80 dark:to-card/40 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-warning/15 dark:bg-warning/20 ring-1 ring-warning/20">
                  <Zap className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {plan.annualItems.filter((i) => i.type === "action").length +
                      plan.quarters.Q1.items.filter((i) => i.type === "action").length +
                      plan.quarters.Q2.items.filter((i) => i.type === "action").length +
                      plan.quarters.Q3.items.filter((i) => i.type === "action").length +
                      plan.quarters.Q4.items.filter((i) => i.type === "action").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Действия</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 dark:border-border/30 bg-gradient-to-br from-card to-card/80 dark:from-card/80 dark:to-card/40 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-muted dark:bg-muted/50 ring-1 ring-border/50">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalItems}</p>
                  <p className="text-xs text-muted-foreground">Общо елементи</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-xl">
            <TabsTrigger value="annual">Годишен</TabsTrigger>
            <TabsTrigger value="Q1">Q1</TabsTrigger>
            <TabsTrigger value="Q2">Q2</TabsTrigger>
            <TabsTrigger value="Q3">Q3</TabsTrigger>
            <TabsTrigger value="Q4">Q4</TabsTrigger>
          </TabsList>

          <TabsContent value="annual" className="mt-6">
            <PlanSection
              title="Годишен план"
              icon={Target}
              goals={plan.annualGoals}
              items={plan.annualItems}
              onAddGoal={handleAddAnnualGoal}
              onUpdateGoal={handleUpdateAnnualGoal}
              onDeleteGoal={handleDeleteAnnualGoal}
              onAddItem={handleAddAnnualItem}
              onUpdateItem={handleUpdateAnnualItem}
              onDeleteItem={handleDeleteAnnualItem}
            />
          </TabsContent>

          {(["Q1", "Q2", "Q3", "Q4"] as const).map((quarter) => (
            <TabsContent key={quarter} value={quarter} className="mt-6 space-y-6">
              <PlanSection
                title={`${quarter} план`}
                icon={Target}
                goals={plan.quarters[quarter].goals}
                items={plan.quarters[quarter].items}
                onAddGoal={(goal) => handleAddQuarterGoal(quarter, goal)}
                onUpdateGoal={(goal) => handleUpdateQuarterGoal(quarter, goal)}
                onDeleteGoal={(id) => handleDeleteQuarterGoal(quarter, id)}
                onAddItem={(item) => handleAddQuarterItem(quarter, item)}
                onUpdateItem={(item) => handleUpdateQuarterItem(quarter, item)}
                onDeleteItem={(id) => handleDeleteQuarterItem(quarter, id)}
              />
              <QuarterWeeksView
                quarter={quarter}
                year={plan.year}
                goals={plan.quarters[quarter].goals}
                items={plan.quarters[quarter].items}
                weeklyTasks={plan.quarters[quarter].weeklyTasks}
                onWeeklyTasksUpdate={(weekNumber, tasks) => {
                  setPlan((prev) => ({
                    ...prev,
                    quarters: {
                      ...prev.quarters,
                      [quarter]: {
                        ...prev.quarters[quarter],
                        weeklyTasks: {
                          ...prev.quarters[quarter].weeklyTasks,
                          [weekNumber]: tasks,
                        },
                      },
                    },
                  }));
                }}
                businessPlanId={null}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}
