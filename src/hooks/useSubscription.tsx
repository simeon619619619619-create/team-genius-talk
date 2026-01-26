import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Stripe price and product IDs
export const STRIPE_PLANS = {
  lifetime: {
    priceId: "price_1StEC6HH4asvT4B6kH5XAWT3",
    productId: "prod_Tqw4PM0Wt675oi",
    price: 239.99,
    name: "Lifetime",
    interval: null,
  },
  yearly: {
    priceId: "price_1StECBHH4asvT4B6aO3ytc9R",
    productId: "prod_Tqw4G9UrLP9tOQ",
    price: 79.99,
    name: "Yearly",
    interval: "year",
  },
  monthly: {
    priceId: "price_1StECCHH4asvT4B6eLBE30ev",
    productId: "prod_Tqw4zubGPqPvc8",
    price: 10.99,
    name: "Monthly",
    interval: "month",
  },
} as const;

export type PlanType = "free" | "monthly" | "yearly" | "lifetime";

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

  const checkSubscription = useCallback(async () => {
    // Prevent concurrent checks
    if (checkInProgress.current) return;
    
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
        console.error("Error checking subscription:", error);
        setSubscribed(false);
        setPlanType("free");
        return;
      }

      setSubscribed(data.subscribed || false);
      setPlanType(data.plan_type || "free");
      setSubscriptionEnd(data.subscription_end || null);
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscribed(false);
      setPlanType("free");
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
