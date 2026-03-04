-- Prevent RLS recursion between projects <-> user_roles

-- Helper: check ownership without invoking projects RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND p.owner_id = _user_id
  );
$$;

-- Replace recursive SELECT policy on user_roles (it previously used has_project_access)
DROP POLICY IF EXISTS "Users can view roles for their projects" ON public.user_roles;

CREATE POLICY "Users can view roles for accessible projects"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_project_owner(auth.uid(), project_id)
);
