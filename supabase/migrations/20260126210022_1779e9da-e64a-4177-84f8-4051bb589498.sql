-- Drop the problematic policies with infinite recursion
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can remove members" ON public.organization_members;

-- Create fixed policies without recursion
CREATE POLICY "Members can view organization members" 
ON public.organization_members 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_members.organization_id 
    AND o.owner_id = auth.uid()
  )
);

CREATE POLICY "Organization owners and admins can add members" 
ON public.organization_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_members.organization_id 
    AND o.owner_id = auth.uid()
  )
);

CREATE POLICY "Organization owners and admins can remove members" 
ON public.organization_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_members.organization_id 
    AND o.owner_id = auth.uid()
  )
);