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
  { icon: LayoutDashboard, label: "Табло", path: "/" },
  { icon: MessageSquare, label: "AI Асистент", path: "/assistant" },
  { icon: ListTodo, label: "Задачи", path: "/tasks" },
  { icon: TrendingUp, label: "Маркетинг план", path: "/plan" },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showDot = item.path === "/assistant" && showBadge && pendingCount > 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-6 w-6 transition-transform",
                  isActive && "scale-110"
                )} />
                {showDot && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary-foreground">
                      {pendingCount > 9 ? "9" : pendingCount}
                    </span>
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 h-1 w-8 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl text-muted-foreground transition-all">
              <Menu className="h-6 w-6" />
              <span className="text-[10px] font-medium">Още</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <div className="py-4 space-y-2">
              {allNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <span className="font-medium">{item.label}</span>
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
