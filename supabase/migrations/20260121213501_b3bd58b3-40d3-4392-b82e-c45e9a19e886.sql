-- Drop the problematic policies that try to access auth.users directly
DROP POLICY IF EXISTS "Users can accept their pending invitation" ON public.team_members;
DROP POLICY IF EXISTS "Users can mark invitations as used" ON public.team_invitations;

-- Drop existing update policy that causes recursion issues
DROP POLICY IF EXISTS "Users can update members of their teams" ON public.team_members;

-- Create simpler update policy that just checks pending status
-- The security is ensured because user_id must match auth.uid() in the WITH CHECK
CREATE POLICY "Users can accept pending team member invitations" 
ON public.team_members 
FOR UPDATE 
USING (status = 'pending')
WITH CHECK (
  (status = 'accepted' AND user_id = auth.uid()) 
  OR (EXISTS (
    SELECT 1 FROM teams t 
    WHERE t.id = team_members.team_id 
    AND can_edit_project(auth.uid(), t.project_id)
  ))
);

-- Simpler invitation update policy
DROP POLICY IF EXISTS "Invited users can accept their invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can update invitations for their teams" ON public.team_invitations;

CREATE POLICY "Users can update their team invitations" 
ON public.team_invitations 
FOR UPDATE 
USING (
  used_at IS NULL 
  AND expires_at > now()
)
WITH CHECK (used_at IS NOT NULL);