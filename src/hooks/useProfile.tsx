import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  instagram: string | null;
  user_type: "worker" | "owner" | null;
  onboarding_completed: boolean;
  workspace_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as Profile | null);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [fetchProfile, authLoading]);

  const updateProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
      
      await fetchProfile();
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  };

  const needsOnboarding = () => {
    if (authLoading || loading) return false;
    if (!user) return false;
    if (!profile) return true;
    return !profile.onboarding_completed;
  };

  return {
    profile,
    loading: authLoading || loading,
    updateProfile,
    needsOnboarding,
    refetch: fetchProfile,
  };
}
