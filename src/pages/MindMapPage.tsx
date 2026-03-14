import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  Users,
  DollarSign,
  Megaphone,
  Target,
  Mail,
  Share2,
  ShoppingCart,
  CreditCard,
  Repeat,
  Gift,
  Star,
  TrendingUp,
  Globe,
  MessageCircle,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Process categories
const CATEGORIES = [
  {
    id: "acquisition",
    label: "Привличане на клиенти",
    icon: Users,
    color: "#3b82f6",
    description: "Как клиентите ви намират",
  },
  {
    id: "conversion",
    label: "Конвертиране",
    icon: Target,
    color: "#8b5cf6",
    description: "Как превръщате интереса в продажба",
  },
  {
    id: "revenue",
    label: "Приходи",
    icon: DollarSign,
    color: "#10b981",
    description: "Как взимате парите",
  },
  {
    id: "retention",
    label: "Задържане",
    icon: Repeat,
    color: "#f59e0b",
    description: "Как карате клиентите да се върнат",
  },
];

// Default processes with steps
const DEFAULT_PROCESSES: ProcessData[] = [
  {
    id: "social-media",
    category: "acquisition",
    title: "Социални мрежи",
    icon: "Share2",
    steps: [
      "Създаване на съдържание (Reels, Stories, постове)",
      "Публикуване по график (3-5 пъти седмично)",
      "Ангажиране с коментари и съобщения",
      "Анализ на резултатите и оптимизация",
    ],
  },
  {
    id: "paid-ads",
    category: "acquisition",
    title: "Платена реклама",
    icon: "Megaphone",
    steps: [
      "Определяне на таргет аудитория",
      "Създаване на рекламни криейтиви",
      "Настройване на Meta/Google Ads кампания",
      "A/B тест на рекламите",
      "Мащабиране на печеливши реклами",
    ],
  },
  {
    id: "email-marketing",
    category: "acquisition",
    title: "Имейл маркетинг",
    icon: "Mail",
    steps: [
      "Lead magnet (безплатен ресурс)",
      "Landing page за събиране на имейли",
      "Welcome email последователност",
      "Седмичен newsletter с полезно съдържание",
    ],
  },
  {
    id: "website",
    category: "acquisition",
    title: "Уебсайт & SEO",
    icon: "Globe",
    steps: [
      "Оптимизация на сайта за ключови думи",
      "Блог с полезно съдържание",
      "Google My Business профил",
      "Линк билдинг стратегия",
    ],
  },
  {
    id: "referral",
    category: "acquisition",
    title: "Препоръки",
    icon: "MessageCircle",
    steps: [
      "Програма за препоръки с награди",
      "Отзиви и testimonials от клиенти",
      "Партньорства с други бизнеси",
    ],
  },
  {
    id: "landing-page",
    category: "conversion",
    title: "Landing Page фуния",
    icon: "Target",
    steps: [
      "Заглавие с ясна полза за клиента",
      "Социално доказателство (отзиви, числа)",
      "Ясен Call-to-Action бутон",
      "Формуляр за контакт/покупка",
      "Follow-up имейл или обаждане",
    ],
  },
  {
    id: "sales-call",
    category: "conversion",
    title: "Продажбено обаждане",
    icon: "MessageCircle",
    steps: [
      "Квалифициране на лийда",
      "Discovery call — разбиране на нуждите",
      "Презентация на решението",
      "Обработка на възражения",
      "Затваряне на сделката",
    ],
  },
  {
    id: "direct-sale",
    category: "revenue",
    title: "Директна продажба",
    icon: "ShoppingCart",
    steps: [
      "Продуктова страница с описание и цена",
      "Кошница за пазаруване",
      "Checkout процес",
      "Потвърждение и фактура",
    ],
  },
  {
    id: "subscription",
    category: "revenue",
    title: "Абонамент",
    icon: "CreditCard",
    steps: [
      "Безплатен пробен период / freemium",
      "Плащане на месечен/годишен абонамент",
      "Автоматично подновяване",
      "Upsell към по-висок план",
    ],
  },
  {
    id: "upsell",
    category: "revenue",
    title: "Upsell & Cross-sell",
    icon: "TrendingUp",
    steps: [
      "Предлагане на допълнителен продукт след покупка",
      "Бъндъл оферти (пакети)",
      "Персонализирани препоръки",
    ],
  },
  {
    id: "loyalty",
    category: "retention",
    title: "Лоялност",
    icon: "Star",
    steps: [
      "Програма за лоялни клиенти / точки",
      "Ексклузивни отстъпки за постоянни клиенти",
      "Ранен достъп до нови продукти",
    ],
  },
  {
    id: "reengagement",
    category: "retention",
    title: "Реактивиране",
    icon: "Gift",
    steps: [
      "Имейл за неактивни клиенти",
      "Специална оферта за завръщане",
      "Анкета за обратна връзка",
      "Персонализирано съдържание",
    ],
  },
];

interface ProcessData {
  id: string;
  category: string;
  title: string;
  icon: string;
  steps: string[];
}

interface ProcessItemProps {
  process: ProcessData;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  categoryColor: string;
}

function ProcessItem({ process, isSelected, onClick, onDelete, categoryColor }: ProcessItemProps) {
  const IconComponent = getIcon(process.icon);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all group",
        isSelected
          ? "bg-primary/10 text-primary border border-primary/20"
          : "hover:bg-secondary/80 border border-transparent"
      )}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
      >
        <IconComponent className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium truncate flex-1">{process.title}</span>
      <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", isSelected && "rotate-90")} />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
      >
        <Trash2 className="w-3 h-3 text-destructive" />
      </button>
    </button>
  );
}

function getIcon(name: string) {
  const icons: Record<string, any> = {
    Share2, Megaphone, Mail, Globe, MessageCircle, Target, ShoppingCart, CreditCard, TrendingUp, Star, Gift, Users, DollarSign, Repeat,
  };
  return icons[name] || Target;
}

// Build ReactFlow nodes and edges from a process
function buildFlowData(process: ProcessData, categoryColor: string) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Center node
  nodes.push({
    id: "center",
    data: {
      label: (
        <div className="flex items-center gap-2 font-semibold text-base">
          {process.title}
        </div>
      ),
    },
    position: { x: 400, y: 40 },
    style: {
      background: categoryColor,
      color: "#fff",
      border: "none",
      borderRadius: "16px",
      padding: "16px 28px",
      fontSize: "15px",
      fontWeight: 600,
      boxShadow: `0 8px 30px ${categoryColor}40`,
      minWidth: "200px",
      textAlign: "center" as const,
    },
  });

  // Step nodes
  process.steps.forEach((step, i) => {
    const totalSteps = process.steps.length;
    const isEven = totalSteps <= 4;

    // Layout: vertical cascade with alternating left-right
    const xOffset = i % 2 === 0 ? -120 : 120;
    const x = 400 + (isEven ? 0 : xOffset);
    const y = 140 + i * 110;

    nodes.push({
      id: `step-${i}`,
      data: {
        label: (
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: `${categoryColor}20`, color: categoryColor }}
            >
              {i + 1}
            </span>
            <span className="text-sm">{step}</span>
          </div>
        ),
      },
      position: { x, y },
      style: {
        border: `2px solid ${categoryColor}30`,
        borderRadius: "12px",
        padding: "12px 16px",
        fontSize: "13px",
        background: "var(--card)",
        color: "var(--card-foreground)",
        maxWidth: "320px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      },
    });

    // Edge from previous to this
    const sourceId = i === 0 ? "center" : `step-${i - 1}`;
    edges.push({
      id: `e-${sourceId}-step-${i}`,
      source: sourceId,
      target: `step-${i}`,
      type: "smoothstep",
      animated: true,
      style: { stroke: categoryColor, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: categoryColor },
    });
  });

  return { nodes, edges };
}

export default function MindMapPage() {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<ProcessData[]>(DEFAULT_PROCESSES);
  const [selectedProcess, setSelectedProcess] = useState<ProcessData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("acquisition");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingProcess, setEditingProcess] = useState<ProcessData | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSteps, setNewSteps] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load saved processes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`mindmap-processes-${user?.id}`);
    if (saved) {
      try {
        setProcesses(JSON.parse(saved));
      } catch {
        // use defaults
      }
    }
  }, [user?.id]);

  // Save processes to localStorage
  const saveProcesses = useCallback((procs: ProcessData[]) => {
    setProcesses(procs);
    if (user?.id) {
      localStorage.setItem(`mindmap-processes-${user.id}`, JSON.stringify(procs));
    }
  }, [user?.id]);

  // Select a process and build flow
  const selectProcess = useCallback((process: ProcessData) => {
    setSelectedProcess(process);
    const cat = CATEGORIES.find(c => c.id === process.category);
    const { nodes: n, edges: e } = buildFlowData(process, cat?.color || "#3b82f6");
    setNodes(n);
    setEdges(e);
  }, [setNodes, setEdges]);

  // Auto-select first process of category
  useEffect(() => {
    const catProcesses = processes.filter(p => p.category === selectedCategory);
    if (catProcesses.length > 0 && (!selectedProcess || selectedProcess.category !== selectedCategory)) {
      selectProcess(catProcesses[0]);
    }
  }, [selectedCategory, processes]);

  const addProcess = () => {
    if (!newTitle.trim()) return;
    const steps = newSteps.split("\n").filter(s => s.trim());
    if (steps.length === 0) {
      toast.error("Добавете поне една стъпка");
      return;
    }
    const newProcess: ProcessData = {
      id: `custom-${Date.now()}`,
      category: selectedCategory,
      title: newTitle.trim(),
      icon: "Target",
      steps,
    };
    saveProcesses([...processes, newProcess]);
    setIsAddingNew(false);
    setNewTitle("");
    setNewSteps("");
    selectProcess(newProcess);
    toast.success("Процесът е добавен!");
  };

  const deleteProcess = (id: string) => {
    const updated = processes.filter(p => p.id !== id);
    saveProcesses(updated);
    if (selectedProcess?.id === id) {
      setSelectedProcess(null);
      setNodes([]);
      setEdges([]);
    }
    toast.success("Процесът е изтрит");
  };

  const updateProcess = (process: ProcessData) => {
    const updated = processes.map(p => p.id === process.id ? process : p);
    saveProcesses(updated);
    selectProcess(process);
    setEditingProcess(null);
    toast.success("Процесът е обновен!");
  };

  const currentCategory = CATEGORIES.find(c => c.id === selectedCategory);
  const categoryProcesses = processes.filter(p => p.category === selectedCategory);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            "border-r border-border bg-card/50 flex flex-col transition-all duration-300 shrink-0",
            sidebarOpen ? "w-80" : "w-0 overflow-hidden"
          )}
        >
          {/* Category tabs */}
          <div className="p-3 border-b border-border">
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                      selectedCategory === cat.id
                        ? "text-white shadow-lg"
                        : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                    )}
                    style={selectedCategory === cat.id ? { backgroundColor: cat.color } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category description */}
          {currentCategory && (
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-xs text-muted-foreground">{currentCategory.description}</p>
            </div>
          )}

          {/* Process list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {categoryProcesses.map(process => (
              <ProcessItem
                key={process.id}
                process={process}
                isSelected={selectedProcess?.id === process.id}
                onClick={() => selectProcess(process)}
                onDelete={() => deleteProcess(process.id)}
                categoryColor={currentCategory?.color || "#3b82f6"}
              />
            ))}

            {categoryProcesses.length === 0 && !isAddingNew && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Няма процеси в тази категория
              </p>
            )}
          </div>

          {/* Add new process */}
          <div className="p-3 border-t border-border">
            {isAddingNew ? (
              <div className="space-y-2">
                <Input
                  placeholder="Име на процеса..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="h-9 text-sm rounded-xl"
                />
                <Textarea
                  placeholder="Стъпки (по една на ред)..."
                  value={newSteps}
                  onChange={e => setNewSteps(e.target.value)}
                  rows={4}
                  className="text-sm rounded-xl resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addProcess} className="flex-1 rounded-xl h-8 text-xs">
                    <Save className="w-3 h-3 mr-1" /> Запази
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsAddingNew(false); setNewTitle(""); setNewSteps(""); }} className="rounded-xl h-8 text-xs">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNew(true)}
                className="w-full rounded-xl h-9 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Добави процес
              </Button>
            )}
          </div>
        </div>

        {/* Mind Map Canvas */}
        <div className="flex-1 relative">
          {selectedProcess ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              connectionMode={ConnectionMode.Loose}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.3}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
              <Controls className="rounded-xl overflow-hidden border border-border shadow-lg" />

              {/* Top panel with process title and edit */}
              <Panel position="top-center">
                <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl px-6 py-3 shadow-lg flex items-center gap-3 mt-2">
                  {editingProcess?.id === selectedProcess.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingProcess.title}
                        onChange={e => setEditingProcess({ ...editingProcess, title: e.target.value })}
                        className="h-8 text-sm w-48 rounded-xl"
                      />
                      <Button size="sm" className="h-8 rounded-xl" onClick={() => updateProcess(editingProcess)}>
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 rounded-xl" onClick={() => setEditingProcess(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${currentCategory?.color}20`, color: currentCategory?.color }}
                      >
                        {(() => { const I = getIcon(selectedProcess.icon); return <I className="w-4 h-4" />; })()}
                      </div>
                      <div>
                        <h2 className="font-semibold text-sm">{selectedProcess.title}</h2>
                        <p className="text-[11px] text-muted-foreground">{selectedProcess.steps.length} стъпки</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-lg"
                        onClick={() => setEditingProcess({ ...selectedProcess })}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </Panel>

              {/* Toggle sidebar button */}
              <Panel position="top-left">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="mt-2 ml-2 rounded-xl h-8 text-xs"
                >
                  {sidebarOpen ? "Скрий менюто" : "Покажи менюто"}
                </Button>
              </Panel>
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto">
                  <Target className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium">Изберете процес от менюто</p>
                <p className="text-sm text-muted-foreground/70">Кликнете върху процес, за да видите стъпките</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
