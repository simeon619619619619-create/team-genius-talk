import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  ListTodo, 
  MessageSquare, 
  Settings,
  TrendingUp,
  FileText,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const baseNavItems = [
  { icon: LayoutDashboard, label: "Табло", path: "/" },
  { icon: MessageSquare, label: "AI Асистент", path: "/assistant" },
  { icon: Users, label: "Екипи", path: "/teams" },
  { icon: ListTodo, label: "Задачи", path: "/tasks" },
  { icon: TrendingUp, label: "Маркетинг план", path: "/plan" },
  { icon: FileText, label: "Бизнес план", path: "/business-plan" },
  { icon: Settings, label: "Настройки", path: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminStatus();
  }, [user]);

  const navItems = isAdmin 
    ? [...baseNavItems, { icon: Shield, label: "Админ", path: "/admin" }]
    : baseNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              BizPlan<span className="text-primary">AI</span>
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="rounded-lg bg-secondary p-4">
            <p className="text-xs text-muted-foreground">
              Създай бизнес план с AI помощ
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
