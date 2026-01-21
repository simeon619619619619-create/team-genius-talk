-- Create a security definer function to check if user has access via user_roles
-- This avoids infinite recursion between projects and user_roles RLS policies
CREATE OR REPLACE FUNCTION public.user_has_role_for_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE project_id = _project_id
      AND user_id = _user_id
  )
$$;

-- Drop and recreate the projects SELECT policy to use the security definer function
DROP POLICY IF EXISTS "Users can view their own or accessible projects" ON public.projects;

CREATE POLICY "Users can view their own or accessible projects"
ON public.projects
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR user_has_role_for_project(auth.uid(), id)
);