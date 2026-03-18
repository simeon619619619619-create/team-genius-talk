import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Stripe price and product IDs
export const STRIPE_PLANS = {
  lifetime: {
    priceId: "price_1TCIpZHH4asvT4B6J5BdANEW",
    productId: "prod_UAe7hdgSEXhH89",
    price: 499,
    name: "Lifetime",
    interval: null,
  },
  biannual: {
    priceId: "price_1TCIpFHH4asvT4B6Fwl1WzJ7",
    productId: "prod_UAe7YaBvkjXz42",
    price: 149,
    name: "6 Months",
    interval: "6months",
  },
  monthly: {
    priceId: "price_1TCIooHH4asvT4B6j0yYcCvA",
    productId: "prod_UAe7XE0Vz6rW0j",
    price: 29,
    name: "Monthly",
    interval: "month",
  },
} as const;

export type PlanType = "free" | "monthly" | "biannual" | "lifetime";

interface SubscriptionContextType {
  subscribed: boolean;
  planType: PlanType;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (planKey: keyof typeof STRIPE_PLANS) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [planType, setPlanType] = useState<PlanType>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const checkInProgress = useRef(false);
  const subscriptionCheckDisabledRef = useRef(false);

  const checkSubscription = useCallback(async () => {
    // Prevent concurrent checks
    if (checkInProgress.current) return;
    if (subscriptionCheckDisabledRef.current) {
      setLoading(false);
      return;
    }
    
    // Don't check if auth is still loading or no valid session
    if (authLoading || !session?.access_token) {
      if (!authLoading) {
        setSubscribed(false);
        setPlanType("free");
        setSubscriptionEnd(null);
        setLoading(false);
      }
      return;
    }

    checkInProgress.current = true;

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        const msg = (error as any)?.message ? String((error as any).message) : "";
        const status = (error as any)?.context?.status ?? (error as any)?.status;

        // If the edge function isn't deployed/configured yet, disable future checks.
        if (status === 401 || msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
          subscriptionCheckDisabledRef.current = true;
          setSubscribed(false);
          setPlanType("free");
          setSubscriptionEnd(null);
          return;
        }

        // Soft-fail any function errors (don't crash app). Disable further checks to avoid console spam.
        subscriptionCheckDisabledRef.current = true;
        setSubscribed(false);
        setPlanType("free");
        setSubscriptionEnd(null);
        return;
      }

      setSubscribed(data.subscribed || false);
      setPlanType(data.plan_type || "free");
      setSubscriptionEnd(data.subscription_end || null);
    } catch (error) {
      // Network/errors: don't block app or spam. Disable future checks.
      subscriptionCheckDisabledRef.current = true;
      setSubscribed(false);
      setPlanType("free");
      setSubscriptionEnd(null);
    } finally {
      setLoading(false);
      checkInProgress.current = false;
    }
  }, [session?.access_token, authLoading]);

  const createCheckout = useCallback(async (planKey: keyof typeof STRIPE_PLANS) => {
    if (!session?.access_token) {
      throw new Error("User not authenticated");
    }

    const plan = STRIPE_PLANS[planKey];
    const mode = planKey === "lifetime" ? "payment" : "subscription";

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId: plan.priceId, mode },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, [session?.access_token]);

  const openCustomerPortal = useCallback(async () => {
    if (!session?.access_token) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.functions.invoke("customer-portal", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, [session?.access_token]);

  // Check subscription on mount and when user/session changes
  useEffect(() => {
    // Wait for auth to finish loading and ensure we have a valid session
    if (authLoading) return;
    
    if (user && session?.access_token) {
      checkSubscription();
    } else {
      setSubscribed(false);
      setPlanType("free");
      setSubscriptionEnd(null);
      setLoading(false);
    }
  }, [user, session?.access_token, authLoading, checkSubscription]);

  // Auto-refresh subscription status every minute
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed,
        planType,
        subscriptionEnd,
        loading,
        checkSubscription,
        createCheckout,
        openCustomerPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
