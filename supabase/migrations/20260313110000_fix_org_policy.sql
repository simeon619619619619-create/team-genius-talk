-- Fix: allow users without user_type to create organizations
-- (existing users who completed onboarding before journey_type was added)

DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;

CREATE POLICY "Owners can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND (
        -- user_type is 'owner', OR user_type is null (pre-journey onboarding users)
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()
            AND (user_type = 'owner' OR user_type IS NULL)
        )
    )
    -- Limit to 3 organizations per user
    AND (SELECT COUNT(*) FROM public.organizations WHERE owner_id = auth.uid()) < 3
);
