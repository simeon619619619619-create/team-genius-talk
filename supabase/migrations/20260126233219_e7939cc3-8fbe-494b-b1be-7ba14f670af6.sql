
-- Allow users to create their own user_role when they accept a team invitation
-- This checks that:
-- 1. The user is creating a role for themselves (user_id = auth.uid())
-- 2. There's a corresponding accepted team member record for this user in a team that belongs to the project
CREATE POLICY "Users can create own role when accepting team invitation"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'viewer'
  AND EXISTS (
    SELECT 1 
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE t.project_id = user_roles.project_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'accepted'
  )
);

-- Also allow users to create role when their email matches a pending invitation
-- This is needed because the team_member is updated to accepted in the same transaction
CREATE POLICY "Users can create role for pending invitation by email"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'viewer'
  AND EXISTS (
    SELECT 1 
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE t.project_id = user_roles.project_id
    AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
