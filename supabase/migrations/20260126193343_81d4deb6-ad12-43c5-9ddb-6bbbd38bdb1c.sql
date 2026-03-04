-- Drop and recreate the problematic RLS policy for team_invitations
-- The old policy references auth.users directly which is not allowed

DROP POLICY IF EXISTS "Users can view their own invitations" ON public.team_invitations;

-- Recreate using auth.jwt() to get user email without accessing auth.users table
CREATE POLICY "Users can view their own invitations"
ON public.team_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.id = team_invitations.team_member_id
    AND (
      -- Check if user email matches invited email (using JWT claim)
      tm.email = (auth.jwt() ->> 'email')
      OR
      -- Or if user has edit access to the team's project
      EXISTS (
        SELECT 1
        FROM teams t
        WHERE t.id = tm.team_id
        AND can_edit_project(auth.uid(), t.project_id)
      )
    )
  )
);