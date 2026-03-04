
-- Fix RLS policy for organization_members to allow users to see their own membership records
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;

-- Create more permissive policy: users can see their own membership + organization owners can see all members
CREATE POLICY "Users can view their own memberships and owners can view all"
ON public.organization_members
FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_organization_owner(auth.uid(), organization_id)
);
