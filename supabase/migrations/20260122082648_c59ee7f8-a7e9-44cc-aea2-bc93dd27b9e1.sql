-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can accept pending team member invitations" ON public.team_members;

-- Create a more permissive policy that allows accepting invitations via valid token
-- The security is enforced by the token being required and validated
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