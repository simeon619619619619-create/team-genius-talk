-- Drop the problematic policies with infinite recursion on organizations table
DROP POLICY IF EXISTS "Users can view organizations they own or are members of" ON public.organizations;
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

-- Create fixed policies without recursion for organizations
CREATE POLICY "Users can view organizations they own or are members of" 
ON public.organizations 
FOR SELECT 
USING (
  owner_id = auth.uid() OR
  id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (
  owner_id = auth.uid() AND
  (SELECT user_type FROM public.profiles WHERE user_id = auth.uid()) = 'owner' AND
  (SELECT count(*) FROM public.organizations WHERE owner_id = auth.uid()) < 3
);

CREATE POLICY "Owners can update their organizations" 
ON public.organizations 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations" 
ON public.organizations 
FOR DELETE 
USING (owner_id = auth.uid());