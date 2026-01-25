import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MessageSquare, ListTodo, TrendingUp, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Табло", path: "/" },
  { icon: MessageSquare, label: "Асистент", path: "/assistant" },
  { icon: ListTodo, label: "Задачи", path: "/tasks" },
  { icon: TrendingUp, label: "План", path: "/plan" },
];

const allNavItems = [
  { label: "Табло", path: "/" },
  { label: "AI Асистент", path: "/assistant" },
  { label: "Задачи", path: "/tasks" },
  { label: "Маркетинг план", path: "/plan" },
  { label: "Бизнес план", path: "/business-plan" },
  { label: "Екипи", path: "/teams" },
  { label: "Настройки", path: "/settings" },
];

export function MobileNav() {
  const location = useLocation();
  const { showBadge, pendingCount, markAsViewed } = useDailyTasks();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleNavClick = (path: string) => {
    if (path === "/assistant") {
      markAsViewed();
    }
    setSheetOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showDot = item.path === "/assistant" && showBadge && pendingCount > 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all relative min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )} />
                {showDot && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <span className={cn(
                "text-[10px] leading-tight",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 rounded-2xl text-muted-foreground transition-all active:scale-95 min-w-[60px]">
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">Още</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
            <div className="space-y-1">
              {allNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors active:scale-[0.98]",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
