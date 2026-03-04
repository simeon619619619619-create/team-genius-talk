import { Plus, ListTodo, Users, FileText, TrendingUp, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    icon: ListTodo,
    label: "Нова задача",
    description: "Създай задача",
    path: "/tasks",
    action: "create-task"
  },
  {
    icon: Users,
    label: "Нов екип",
    description: "Създай екип",
    path: "/teams",
    action: "create-team"
  },
  {
    icon: TrendingUp,
    label: "Маркетинг план",
    description: "Започни нов план",
    path: "/plan",
    action: "create-plan"
  },
  {
    icon: FileText,
    label: "Бизнес план",
    description: "Годишно планиране",
    path: "/business-plan",
    action: "create-business"
  },
  {
    icon: MessageSquare,
    label: "AI Асистент",
    description: "Започни разговор",
    path: "/assistant",
    action: "chat"
  },
];

export function QuickCreateButton() {
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    navigate(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="icon" 
          className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-lg transition-all duration-200 hover:scale-105"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Бързо създаване
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => (
          <DropdownMenuItem
            key={action.action}
            onClick={() => handleAction(action.path)}
            className="flex items-center gap-3 py-2.5 cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <action.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
