-- Add organization_id to projects table
ALTER TABLE public.projects 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);

-- Update RLS policies to include organization-based access
DROP POLICY IF EXISTS "Users can view their own or accessible projects" ON public.projects;

CREATE POLICY "Users can view their own or accessible projects"
ON public.projects
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR user_has_role_for_project(auth.uid(), id)
  OR (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);

-- Allow project owners to update their projects including organization assignment
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;

CREATE POLICY "Project owners can update projects"
ON public.projects
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());