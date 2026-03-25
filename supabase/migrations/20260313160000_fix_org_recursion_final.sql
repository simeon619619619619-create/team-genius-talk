-- Break recursion: use SECURITY DEFINER function to get member org IDs
-- This bypasses org_members RLS policy which would otherwise recurse back to organizations

CREATE OR REPLACE FUNCTION public.get_user_member_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$$;

GRANT EXECUTE ON FUNCTION public.get_user_member_org_ids(uuid) TO authenticated;

-- Drop and recreate organizations SELECT policy using the helper function
DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they own or are members of" ON public.organizations;

CREATE POLICY "org_select"
ON public.organizations FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid()
    OR id IN (SELECT public.get_user_member_org_ids(auth.uid()))
);

NOTIFY pgrst, 'reload schema';
