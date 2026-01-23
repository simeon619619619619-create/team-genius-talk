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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/logo.png";

const baseNavItems = [
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Успешно излязохте от профила");
    navigate("/auth");
  };

  const navItems = isAdmin 
    ? [...baseNavItems, { icon: Shield, label: "Админ", path: "/admin" }]
    : baseNavItems;

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
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "justify-between px-6"
          )}>
            <div className="flex items-center gap-3">
              <img 
                src={logo} 
                alt="Симора" 
                className={cn(
                  "h-10 object-contain transition-all duration-300 dark:invert dark:brightness-200",
                  collapsed ? "w-10" : "w-auto max-w-[140px]"
                )}
              />
            </div>
            {!collapsed && <ThemeToggle />}
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
                  "flex items-center font-medium transition-all duration-300 ease-out",
                  collapsed ? "justify-center rounded-2xl p-3" : "gap-3 rounded-full px-4 py-3.5",
                  isActive
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "flex-shrink-0 transition-transform duration-200",
                  isActive && "scale-110"
                )} style={{ width: 22, height: 22 }} />
                {!collapsed && <span className="text-[15px] transition-opacity duration-200">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    {item.label}
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
