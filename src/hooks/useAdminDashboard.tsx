import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Admin emails that always have access
const SUPER_ADMIN_EMAILS = [
  "info@eufashioninstitute.com",
  "simeon619619619619@gmail.com",
];

export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalSubscribers: number;
  lifetimeUsers: number;
  yearlyUsers: number;
  monthlyUsers: number;
  freeUsers: number;
  totalPromoActivations: number;
  totalSessions: number;
  totalMessages: number;
  activeUsersToday: number;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  grants_lifetime_access: boolean;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithSub {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  instagram: string | null;
  created_at: string;
  user_type: string | null;
  onboarding_completed: boolean | null;
  subscription?: SubscriptionRecord | null;
  promoUsed?: string | null;
  lastActive?: string | null;
  messageCount?: number;
}

export interface AppHealthCheck {
  timestamp: string;
  checks: {
    name: string;
    status: "ok" | "warning" | "error";
    message: string;
    details?: string;
  }[];
}

export function useAdminDashboard() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserWithSub[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [healthChecks, setHealthChecks] = useState<AppHealthCheck[]>([]);

  // Check super admin status by email
  const checkSuperAdmin = useCallback(async () => {
    if (!user) {
      setIsSuperAdmin(false);
      return false;
    }

    // Check email
    if (SUPER_ADMIN_EMAILS.includes(user.email || "")) {
      setIsSuperAdmin(true);
      return true;
    }

    // Also check user_roles for admin
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!data;
    setIsSuperAdmin(isAdmin);
    return isAdmin;
  }, [user]);

  // Fetch dashboard statistics
  const fetchStats = useCallback(async () => {
    try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch profiles
    const { data: allProfiles, count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact" });

    // New users today
    const { count: newToday } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart);

    // New users this week
    const { count: newWeek } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStart);

    // New users this month
    const { count: newMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart);

    // Subscriptions
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("*");

    const lifetime = subs?.filter(s => s.plan_type === "lifetime" && s.status === "active").length || 0;
    const yearly = subs?.filter(s => s.plan_type === "yearly" && s.status === "active").length || 0;
    const monthly = subs?.filter(s => s.plan_type === "monthly" && s.status === "active").length || 0;

    // Promo activations
    const { count: promoCount } = await supabase
      .from("used_promo_codes")
      .select("*", { count: "exact", head: true });

    // Chat sessions & messages
    const { count: sessionCount } = await supabase
      .from("chat_sessions")
      .select("*", { count: "exact", head: true });

    const { count: messageCount } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true });

    // Active users today (users with messages today)
    const { data: activeToday } = await supabase
      .from("chat_messages")
      .select("user_id")
      .gte("created_at", todayStart);

    const uniqueActiveToday = new Set(activeToday?.map(m => m.user_id)).size;

    setStats({
      totalUsers: totalUsers || 0,
      newUsersToday: newToday || 0,
      newUsersThisWeek: newWeek || 0,
      newUsersThisMonth: newMonth || 0,
      totalSubscribers: lifetime + yearly + monthly,
      lifetimeUsers: lifetime,
      yearlyUsers: yearly,
      monthlyUsers: monthly,
      freeUsers: (totalUsers || 0) - (lifetime + yearly + monthly),
      totalPromoActivations: promoCount || 0,
      totalSessions: sessionCount || 0,
      totalMessages: messageCount || 0,
      activeUsersToday: uniqueActiveToday,
    });

    // Build users with subscription info
    if (allProfiles) {
      const usersWithSubs: UserWithSub[] = allProfiles.map(p => {
        const sub = subs?.find(s => s.user_id === p.user_id);
        return {
          ...p,
          subscription: sub || null,
          onboarding_completed: p.onboarding_completed ?? null,
        };
      });
      setUsers(usersWithSubs);
    }

    if (subs) setSubscriptions(subs);
    } catch (err) {
      console.error("fetchStats error:", err);
    }
  }, []);

  // Fetch promo codes
  const fetchPromoCodes = useCallback(async () => {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPromoCodes(data);
    }
  }, []);

  // Create promo code
  const createPromoCode = useCallback(async (code: string, description: string, grantsLifetime: boolean, maxUses: number | null, expiresAt: string | null) => {
    const { data, error } = await supabase
      .from("promo_codes")
      .insert({
        code: code.toUpperCase(),
        description,
        grants_lifetime_access: grantsLifetime,
        max_uses: maxUses,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Грешка при създаване на промо код: " + error.message);
      return null;
    }

    setPromoCodes(prev => [data, ...prev]);
    toast.success(`Промо код "${code}" е създаден`);
    return data;
  }, []);

  // Toggle promo code active status
  const togglePromoCode = useCallback(async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: active })
      .eq("id", id);

    if (error) {
      toast.error("Грешка при обновяване на промо кода");
      return;
    }

    setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
    toast.success(active ? "Промо кодът е активиран" : "Промо кодът е деактивиран");
  }, []);

  // Delete promo code
  const deletePromoCode = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Грешка при изтриване");
      return;
    }

    setPromoCodes(prev => prev.filter(p => p.id !== id));
    toast.success("Промо кодът е изтрит");
  }, []);

  // Run app health check
  const runHealthCheck = useCallback(async () => {
    const checks: AppHealthCheck["checks"] = [];

    // Check database connectivity
    try {
      const start = Date.now();
      const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const elapsed = Date.now() - start;
      checks.push({
        name: "База данни",
        status: error ? "error" : elapsed > 2000 ? "warning" : "ok",
        message: error ? "Грешка при връзка" : `Отговор: ${elapsed}ms`,
        details: error?.message,
      });
    } catch {
      checks.push({ name: "База данни", status: "error", message: "Няма връзка" });
    }

    // Check auth service
    try {
      const start = Date.now();
      const { error } = await supabase.auth.getSession();
      const elapsed = Date.now() - start;
      checks.push({
        name: "Автентикация",
        status: error ? "error" : elapsed > 2000 ? "warning" : "ok",
        message: error ? "Грешка" : `Отговор: ${elapsed}ms`,
      });
    } catch {
      checks.push({ name: "Автентикация", status: "error", message: "Няма връзка" });
    }

    // Check edge functions
    try {
      const start = Date.now();
      const { error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });
      const elapsed = Date.now() - start;
      checks.push({
        name: "Edge Functions",
        status: error ? "warning" : elapsed > 3000 ? "warning" : "ok",
        message: error ? "Частична грешка" : `Отговор: ${elapsed}ms`,
      });
    } catch {
      checks.push({ name: "Edge Functions", status: "warning", message: "Не може да се провери" });
    }

    // Check storage
    try {
      const { data, error } = await supabase.storage.listBuckets();
      checks.push({
        name: "Storage",
        status: error ? "error" : "ok",
        message: error ? "Грешка" : `${data?.length || 0} buckets налични`,
      });
    } catch {
      checks.push({ name: "Storage", status: "warning", message: "Не може да се провери" });
    }

    // Check for users without profiles (orphaned auth)
    const { count: profileCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    checks.push({
      name: "Потребители",
      status: "ok",
      message: `${profileCount || 0} регистрирани профила`,
    });

    // Check for active promo codes
    const { data: activePromos } = await supabase
      .from("promo_codes")
      .select("code, current_uses, max_uses, expires_at")
      .eq("is_active", true);

    const expiredPromos = activePromos?.filter(p => p.expires_at && new Date(p.expires_at) < new Date());
    const maxedOutPromos = activePromos?.filter(p => p.max_uses && p.current_uses >= p.max_uses);

    if (expiredPromos && expiredPromos.length > 0) {
      checks.push({
        name: "Промо кодове",
        status: "warning",
        message: `${expiredPromos.length} изтекли но активни промо кода`,
        details: expiredPromos.map(p => p.code).join(", "),
      });
    } else if (maxedOutPromos && maxedOutPromos.length > 0) {
      checks.push({
        name: "Промо кодове",
        status: "warning",
        message: `${maxedOutPromos.length} изчерпани промо кода`,
        details: maxedOutPromos.map(p => p.code).join(", "),
      });
    } else {
      checks.push({
        name: "Промо кодове",
        status: "ok",
        message: `${activePromos?.length || 0} активни промо кода`,
      });
    }

    const healthCheck: AppHealthCheck = {
      timestamp: new Date().toISOString(),
      checks,
    };

    setHealthChecks(prev => [healthCheck, ...prev.slice(0, 49)]);
    return healthCheck;
  }, []);

  // Update subscription pricing
  const updateUserSubscription = useCallback(async (userId: string, planType: string, status: string) => {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("subscriptions")
        .update({ plan_type: planType, status, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (error) {
        toast.error("Грешка при обновяване на абонамента");
        return false;
      }
    } else {
      const { error } = await supabase
        .from("subscriptions")
        .insert({ user_id: userId, plan_type: planType, status });

      if (error) {
        toast.error("Грешка при създаване на абонамент");
        return false;
      }
    }

    toast.success("Абонаментът е обновен");
    await fetchStats();
    return true;
  }, [fetchStats]);

  // Initial load - run once when user changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const isAdmin = await checkSuperAdmin();
        if (isAdmin && !cancelled) {
          await Promise.allSettled([fetchStats(), fetchPromoCodes()]);
        }
      } catch (err) {
        console.error("Admin dashboard load error:", err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]); // Only re-run when user changes, not on every callback recreation

  return {
    isSuperAdmin,
    loading,
    stats,
    users,
    promoCodes,
    subscriptions,
    healthChecks,
    fetchStats,
    fetchPromoCodes,
    createPromoCode,
    togglePromoCode,
    deletePromoCode,
    runHealthCheck,
    updateUserSubscription,
    refetch: async () => {
      await Promise.all([fetchStats(), fetchPromoCodes()]);
    },
  };
}
