-- Fix infinite recursion by avoiding self-references and cross-table recursion

-- 1) organization_members policies should not query organizations directly; use SECURITY DEFINER helper
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can remove members" ON public.organization_members;

CREATE POLICY "Members can view organization members"
ON public.organization_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_organization_owner(auth.uid(), organization_id)
);

CREATE POLICY "Organization owners can add members"
ON public.organization_members
FOR INSERT
WITH CHECK (
  public.is_organization_owner(auth.uid(), organization_id)
);

CREATE POLICY "Organization owners can remove members"
ON public.organization_members
FOR DELETE
USING (
  public.is_organization_owner(auth.uid(), organization_id)
);

-- 2) organizations policies: remove self-query in INSERT; keep SELECT relying on org_members (now safe)
DROP POLICY IF EXISTS "Users can view organizations they own or are members of" ON public.organizations;
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

CREATE POLICY "Users can view organizations they own or are members of"
ON public.organizations
FOR SELECT
USING (
  owner_id = auth.uid()
  OR id IN (
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND (SELECT user_type FROM public.profiles WHERE user_id = auth.uid()) = 'owner'
  AND public.get_user_organization_count(auth.uid()) < 3
);

CREATE POLICY "Owners can update their organizations"
ON public.organizations
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
ON public.organizations
FOR DELETE
USING (owner_id = auth.uid());