-- Fix overly permissive UPDATE policy on team_invitations
DROP POLICY IF EXISTS "Users can update invitations" ON public.team_invitations;

-- Create proper UPDATE policy - only allow updating if user has edit access to the project
CREATE POLICY "Users can update invitations for their teams"
ON public.team_invitations FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.id = team_invitations.team_member_id
    AND can_edit_project(auth.uid(), t.project_id)
));

-- Also allow the invited user to mark invitation as used (when they accept)
CREATE POLICY "Invited users can accept their invitations"
ON public.team_invitations FOR UPDATE
USING (
    used_at IS NULL 
    AND expires_at > now()
    AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = team_invitations.team_member_id
        AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);