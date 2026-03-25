-- Remove user_type restriction from org creation policy entirely.
-- Any authenticated user can create up to 3 orgs (app-level controls worker access).

DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;

CREATE POLICY "Owners can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND (SELECT COUNT(*) FROM public.organizations WHERE owner_id = auth.uid()) < 3
);
