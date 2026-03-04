-- Allow users to update their pending team member record when accepting invitation
CREATE POLICY "Users can accept their pending invitation" 
ON public.team_members 
FOR UPDATE 
USING (status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'accepted');

-- Allow authenticated users to update invitation used_at
CREATE POLICY "Users can mark invitations as used" 
ON public.team_invitations 
FOR UPDATE 
USING (true)
WITH CHECK (used_at IS NOT NULL);