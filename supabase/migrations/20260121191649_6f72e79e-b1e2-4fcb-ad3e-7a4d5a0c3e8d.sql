-- Allow anyone to read team_invitations by token (for invitation acceptance flow)
CREATE POLICY "Anyone can view invitations by token" 
ON public.team_invitations 
FOR SELECT 
USING (true);

-- Allow anyone to read team_members for pending invitations (needed for invitation page)
CREATE POLICY "Anyone can view pending team members" 
ON public.team_members 
FOR SELECT 
USING (status = 'pending');

-- Allow anyone to read teams for invitation display
CREATE POLICY "Anyone can view teams for invitations" 
ON public.teams 
FOR SELECT 
USING (true);