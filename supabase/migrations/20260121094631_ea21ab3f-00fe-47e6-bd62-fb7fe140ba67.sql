-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;

-- Create a new SELECT policy that allows owners to see their projects directly
-- and also allows users with roles to see projects they have access to
CREATE POLICY "Users can view their own or accessible projects"
ON public.projects
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);