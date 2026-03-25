-- Final fix: make is_organization_owner SECURITY DEFINER (stops recursion)
-- and simplify org policies to avoid any circular references

-- 1. Recreate is_organization_owner as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_organization_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = _org_id AND owner_id = _user_id
    )
$$;

-- 2. Drop all existing org policies
DROP POLICY IF EXISTS "Users can view organizations they own or are members of" ON public.organizations;
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

-- 3. Simple, non-recursive policies
CREATE POLICY "org_select"
ON public.organizations FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid()
    OR id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

-- INSERT: just owner_id check + SECURITY DEFINER count (no inline subquery)
CREATE POLICY "org_insert"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND public.get_user_organization_count(auth.uid()) < 3
);

CREATE POLICY "org_update"
ON public.organizations FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "org_delete"
ON public.organizations FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
