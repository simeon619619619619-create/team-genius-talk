import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  ListTodo, 
  MessageSquare, 
  Settings,
  TrendingUp,
  FileText,
  Shield,
  LogOut,
  LogIn,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import logo from "@/assets/logo.png";
import logoIcon from "@/assets/logo-icon.png";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  badge?: number;
}

const baseNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Табло", path: "/" },
  { icon: MessageSquare, label: "AI Асистент", path: "/assistant" },
  { icon: Users, label: "Екипи", path: "/teams" },
  { icon: ListTodo, label: "Задачи", path: "/tasks" },
  { icon: TrendingUp, label: "Маркетинг план", path: "/plan" },
  { icon: FileText, label: "Бизнес план", path: "/business-plan" },
  { icon: Settings, label: "Настройки", path: "/settings" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { pendingCount, showBadge } = useDailyTasks();
  const { profile } = useProfile();
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

  // Check if user is owner type - hide Teams for workers
  const isOwnerType = profile?.user_type === "owner";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Успешно излязохте от профила");
    navigate("/auth");
  };

  // Workers only see Dashboard - they can only accept org invitations
  const isWorkerType = profile?.user_type === "worker";
  
  // Filter navigation based on user type
  const filteredNavItems = baseNavItems.filter(item => {
    // Workers only see Dashboard
    if (isWorkerType) {
      return item.path === "/";
    }
    // Owners see everything except Teams is already handled
    if (item.path === "/teams" && !isOwnerType) {
      return false;
    }
    return true;
  });

  const navItemsWithBadge = filteredNavItems.map(item => {
    if (item.path === "/assistant" && showBadge && pendingCount > 0) {
      return { ...item, badge: pendingCount };
    }
    return item;
  });

  const navItems = isAdmin
    ? [...navItemsWithBadge, { icon: Shield, label: "Админ", path: "/admin" }]
    : navItemsWithBadge;

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 rounded-r-3xl",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Collapse Toggle - positioned on border */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-sm"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        <div className="flex h-full flex-col">
          {/* Logo and Org Switcher */}
          <div className={cn(
            "flex flex-col border-b border-border",
            collapsed ? "p-2 gap-2" : "p-4 gap-3"
          )}>
            <div className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-between"
            )}>
              <div className="flex items-center gap-3">
                <img 
                  src={collapsed ? logoIcon : logo} 
                  alt="Симора" 
                  className={cn(
                    "object-contain transition-all duration-300 dark:invert dark:brightness-200",
                    collapsed ? "h-8 w-8" : "h-10 w-auto max-w-[140px]"
                  )}
                />
              </div>
              {!collapsed && <ThemeToggle />}
            </div>
            
            {/* Organization Switcher */}
            <OrganizationSwitcher collapsed={collapsed} />
          </div>

        {/* Navigation */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-4")}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center font-medium transition-all duration-300 ease-out relative",
                  collapsed ? "justify-center rounded-2xl p-3" : "gap-3 rounded-full px-4 py-3.5",
                  isActive
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className={cn(
                    "flex-shrink-0 transition-transform duration-200",
                    isActive && "scale-110"
                  )} style={{ width: 22, height: 22 }} />
                  {/* Badge for collapsed state */}
                  {collapsed && item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="text-[15px] transition-opacity duration-200 flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge 
                        variant="default" 
                        className="h-5 min-w-5 px-1.5 text-[10px] font-bold animate-pulse bg-primary text-primary-foreground"
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2 flex items-center gap-2">
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <Badge variant="default" className="h-4 px-1 text-[10px]">
                        {item.badge}
                      </Badge>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* User Section */}
        <div className={cn("border-t border-border", collapsed ? "p-2" : "p-4")}>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex w-full items-center rounded-lg hover:bg-secondary transition-colors",
                  collapsed ? "justify-center p-2" : "gap-3 p-3"
                )}>
                  <Avatar className={cn(collapsed ? "h-8 w-8" : "h-10 w-10")}>
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {profile?.full_name || 'Потребител'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Профил
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Изход
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="w-full"
                    onClick={() => navigate("/auth")}
                  >
                    <LogIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  Вход / Регистрация
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="h-4 w-4" />
                Вход / Регистрация
              </Button>
            )
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
