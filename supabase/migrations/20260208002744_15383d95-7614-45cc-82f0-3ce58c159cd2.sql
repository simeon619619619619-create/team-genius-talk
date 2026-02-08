
-- Update the RLS policy to allow creating editor roles when accepting team invitations
DROP POLICY IF EXISTS "Users can create own role when accepting team invitation" ON public.user_roles;
CREATE POLICY "Users can create own role when accepting team invitation"
ON public.user_roles FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('viewer'::app_role, 'editor'::app_role)
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE t.project_id = user_roles.project_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'accepted'
  )
);

-- Also update the email-based policy
DROP POLICY IF EXISTS "Users can create role for pending invitation by email" ON public.user_roles;
CREATE POLICY "Users can create role for pending invitation by email"
ON public.user_roles FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('viewer'::app_role, 'editor'::app_role)
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE t.project_id = user_roles.project_id
      AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);
