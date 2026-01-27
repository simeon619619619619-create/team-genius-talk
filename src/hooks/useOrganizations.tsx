import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export function useOrganizations() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberOrganizations, setMemberOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setMemberOrganizations([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch organizations owned by user
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (ownedError) throw ownedError;

      // Fetch organizations where user is a member (via organization_members)
      const { data: membershipData, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const memberOrgIds = membershipData?.map(m => m.organization_id) || [];
      
      // Also check for organizations via user_roles + projects
      const { data: userRolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("project_id")
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      // Get organization_ids from projects where user has roles
      let projectOrgIds: string[] = [];
      if (userRolesData && userRolesData.length > 0) {
        const projectIds = userRolesData.map(r => r.project_id);
        const { data: projectsData } = await supabase
          .from("projects")
          .select("organization_id")
          .in("id", projectIds)
          .not("organization_id", "is", null);

        if (projectsData) {
          projectOrgIds = projectsData
            .map(p => p.organization_id)
            .filter((id): id is string => id !== null);
        }
      }

      // Combine all organization IDs (excluding ones user owns)
      const ownedOrgIds = ownedOrgs?.map(o => o.id) || [];
      const allMemberOrgIds = [...new Set([...memberOrgIds, ...projectOrgIds])]
        .filter(id => !ownedOrgIds.includes(id));
      
      let memberOrgs: Organization[] = [];
      if (allMemberOrgIds.length > 0) {
        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .in("id", allMemberOrgIds);

        if (orgsError) throw orgsError;
        memberOrgs = orgs || [];
      }

      setOrganizations(ownedOrgs || []);
      setMemberOrganizations(memberOrgs);

      // Set current organization from localStorage or first owned
      const storedOrgId = localStorage.getItem("currentOrganizationId");
      const allOrgs = [...(ownedOrgs || []), ...memberOrgs];
      
      if (storedOrgId) {
        const found = allOrgs.find(o => o.id === storedOrgId);
        if (found) {
          setCurrentOrganization(found);
        } else if (allOrgs.length > 0) {
          setCurrentOrganization(allOrgs[0]);
          localStorage.setItem("currentOrganizationId", allOrgs[0].id);
        }
      } else if (allOrgs.length > 0) {
        setCurrentOrganization(allOrgs[0]);
        localStorage.setItem("currentOrganizationId", allOrgs[0].id);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const createOrganization = async (name: string): Promise<Organization | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Also add owner as member
      await supabase
        .from("organization_members")
        .insert({ 
          organization_id: data.id, 
          user_id: user.id, 
          role: "owner" 
        });

      await fetchOrganizations();
      return data;
    } catch (error) {
      console.error("Error creating organization:", error);
      return null;
    }
  };

  const switchOrganization = (org: Organization | null) => {
    setCurrentOrganization(org);
    if (org) {
      localStorage.setItem("currentOrganizationId", org.id);
    } else {
      localStorage.removeItem("currentOrganizationId");
    }
  };

  const updateOrganization = async (orgId: string, name: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name })
        .eq("id", orgId)
        .eq("owner_id", user.id);

      if (error) throw error;
      
      await fetchOrganizations();
      return true;
    } catch (error) {
      console.error("Error updating organization:", error);
      return false;
    }
  };

  const deleteOrganization = async (orgId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // First delete all organization members
      await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", orgId);

      // Then delete the organization
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId)
        .eq("owner_id", user.id);

      if (error) throw error;
      
      // If deleted org was current, switch to first available or null
      if (currentOrganization?.id === orgId) {
        const remaining = organizations.filter(o => o.id !== orgId);
        const allRemaining = [...remaining, ...memberOrganizations];
        if (allRemaining.length > 0) {
          switchOrganization(allRemaining[0]);
        } else {
          switchOrganization(null);
        }
      }
      
      await fetchOrganizations();
      return true;
    } catch (error) {
      console.error("Error deleting organization:", error);
      return false;
    }
  };

  const isOrganizationOwner = (orgId: string) => {
    return organizations.some(o => o.id === orgId);
  };

  const canCreateOrganization = () => {
    return organizations.length < 3;
  };

  const getAllOrganizations = () => {
    return [...organizations, ...memberOrganizations];
  };

  return {
    organizations,
    memberOrganizations,
    currentOrganization,
    loading,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    switchOrganization,
    isOrganizationOwner,
    canCreateOrganization,
    getAllOrganizations,
    refetch: fetchOrganizations,
  };
}
