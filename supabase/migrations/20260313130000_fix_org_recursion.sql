-- Fix infinite recursion: use SECURITY DEFINER function for count (bypasses RLS)
-- and remove the user_type requirement

DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;

CREATE POLICY "Owners can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND public.get_user_organization_count(auth.uid()) < 3
);
