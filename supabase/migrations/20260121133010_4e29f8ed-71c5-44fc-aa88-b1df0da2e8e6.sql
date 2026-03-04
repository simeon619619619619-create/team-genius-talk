-- Fix team_members RLS policy for invitation acceptance
-- This ensures users can only accept invitations where their email matches

-- Drop existing UPDATE policy for team_members
DROP POLICY IF EXISTS "Users can update members of their teams" ON public.team_members;

-- Create a more secure policy that handles both:
-- 1. Users accepting their own invitations (email must match)
-- 2. Project editors managing team members
CREATE POLICY "Users can update members of their teams"
ON public.team_members
FOR UPDATE
USING (
  -- Allow if user's email matches the team member email (accepting own invitation)
  (
    status = 'pending' 
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
  OR
  -- Allow if user is a project editor/owner
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
    AND can_edit_project(auth.uid(), t.project_id)
  )
);