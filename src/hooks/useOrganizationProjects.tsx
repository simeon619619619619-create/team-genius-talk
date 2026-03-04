import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "./useOrganizations";

export interface OrganizationProject {
  id: string;
  name: string;
  owner_id: string;
}

export function useOrganizationProjects() {
  const { currentOrganization } = useOrganizations();
  const [projects, setProjects] = useState<OrganizationProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentOrganization) {
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, owner_id")
          .eq("organization_id", currentOrganization.id)
          .order("name");

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error("Error fetching organization projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentOrganization]);

  return { projects, loading };
}
