import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  instagram: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  project_id: string;
  role: "admin" | "owner" | "editor" | "viewer";
  invited_email: string | null;
  created_at: string;
}

export interface GlobalBot {
  id: string;
  step_key: string;
  name: string;
  description: string | null;
  instructions: string;
  model: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdmin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [globalBots, setGlobalBots] = useState<GlobalBot[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return false;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    const adminStatus = !!data && !error;
    setIsAdmin(adminStatus);
    return adminStatus;
  }, [user]);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }
    setProfiles(data || []);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching roles:", error);
      return;
    }
    setRoles(data || []);
  }, []);

  const fetchGlobalBots = useCallback(async () => {
    const { data, error } = await supabase
      .from('global_bots')
      .select('*')
      .order('step_key');

    if (error) {
      console.error("Error fetching global bots:", error);
      return;
    }
    setGlobalBots(data || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const isAdminUser = await checkAdminStatus();
    
    if (isAdminUser) {
      await Promise.all([fetchProfiles(), fetchRoles(), fetchGlobalBots()]);
    }
    
    setLoading(false);
  }, [checkAdminStatus, fetchProfiles, fetchRoles, fetchGlobalBots]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateProfile = async (profileId: string, updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId);

    if (error) {
      toast.error("Грешка при обновяване на профила");
      return false;
    }

    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...updates } : p));
    toast.success("Профилът е обновен");
    return true;
  };

  const deleteProfile = async (profileId: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (error) {
      toast.error("Грешка при изтриване на профила");
      return false;
    }

    setProfiles(prev => prev.filter(p => p.id !== profileId));
    toast.success("Профилът е изтрит");
    return true;
  };

  const addRole = async (userId: string, projectId: string, role: UserRole['role']) => {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, project_id: projectId, role })
      .select()
      .single();

    if (error) {
      toast.error("Грешка при добавяне на роля");
      return null;
    }

    setRoles(prev => [...prev, data]);
    toast.success("Ролята е добавена");
    return data;
  };

  const updateRole = async (roleId: string, newRole: UserRole['role']) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', roleId);

    if (error) {
      toast.error("Грешка при обновяване на ролята");
      return false;
    }

    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, role: newRole } : r));
    toast.success("Ролята е обновена");
    return true;
  };

  const deleteRole = async (roleId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      toast.error("Грешка при изтриване на ролята");
      return false;
    }

    setRoles(prev => prev.filter(r => r.id !== roleId));
    toast.success("Ролята е изтрита");
    return true;
  };

  const updateGlobalBot = async (botId: string, updates: Partial<GlobalBot>) => {
    const { error } = await supabase
      .from('global_bots')
      .update(updates)
      .eq('id', botId);

    if (error) {
      toast.error("Грешка при обновяване на бота");
      return false;
    }

    setGlobalBots(prev => prev.map(b => b.id === botId ? { ...b, ...updates } : b));
    toast.success("Ботът е обновен");
    return true;
  };

  const createGlobalBot = async (bot: Omit<GlobalBot, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('global_bots')
      .insert(bot)
      .select()
      .single();

    if (error) {
      toast.error("Грешка при създаване на бота");
      return null;
    }

    setGlobalBots(prev => [...prev, data]);
    toast.success("Ботът е създаден");
    return data;
  };

  const deleteGlobalBot = async (botId: string) => {
    const { error } = await supabase
      .from('global_bots')
      .delete()
      .eq('id', botId);

    if (error) {
      toast.error("Грешка при изтриване на бота");
      return false;
    }

    setGlobalBots(prev => prev.filter(b => b.id !== botId));
    toast.success("Ботът е изтрит");
    return true;
  };

  return {
    profiles,
    roles,
    globalBots,
    isAdmin,
    loading,
    updateProfile,
    deleteProfile,
    addRole,
    updateRole,
    deleteRole,
    updateGlobalBot,
    createGlobalBot,
    deleteGlobalBot,
    refetch: fetchAll,
  };
}
