-- Fix team_invitations RLS policy - restrict public access
-- The current policy allows anyone to read all invitation records, which is a security risk

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.team_invitations;

-- Create a more restrictive policy that only allows:
-- 1. Authenticated users to view invitations where their email matches the team member's email
-- 2. Project editors/owners to view invitations they created
CREATE POLICY "Users can view their own invitations"
ON public.team_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = team_invitations.team_member_id
    AND (
      -- User's email matches the invitation email
      tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      -- Or user is a project editor/owner
      OR EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = tm.team_id
        AND can_edit_project(auth.uid(), t.project_id)
      )
    )
  )
);