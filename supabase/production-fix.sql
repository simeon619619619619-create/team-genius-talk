-- ============================================================
-- PRODUCTION FIX: Run this in your Supabase SQL Editor
-- for project: dbepjydvynlrtzdhbxu
-- ============================================================

-- 1. Add columns to profiles (if not already present)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_type text CHECK (user_type IN ('worker', 'owner')),
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- 2. Create organizations table (if not exists)
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create organization_members table (if not exists)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions
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

CREATE OR REPLACE FUNCTION public.get_user_organization_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::integer FROM public.organizations WHERE owner_id = _user_id
$$;

-- 5. Organizations RLS policies (drop old ones first, then create correct ones)
DROP POLICY IF EXISTS "Users can view organizations they own or are members of" ON public.organizations;
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

CREATE POLICY "Users can view organizations they own or are members of"
ON public.organizations FOR SELECT
USING (
  owner_id = auth.uid()
  OR id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND public.get_user_organization_count(auth.uid()) < 3
);

CREATE POLICY "Owners can update their organizations"
ON public.organizations FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
ON public.organizations FOR DELETE
USING (owner_id = auth.uid());

-- 6. Organization members RLS policies
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships and owners can view all" ON public.organization_members;

CREATE POLICY "Users can view their own memberships and owners can view all"
ON public.organization_members FOR SELECT
USING (
  user_id = auth.uid()
  OR is_organization_owner(auth.uid(), organization_id)
);

CREATE POLICY "Organization owners can add members"
ON public.organization_members FOR INSERT
WITH CHECK (
  public.is_organization_owner(auth.uid(), organization_id)
);

CREATE POLICY "Organization owners can remove members"
ON public.organization_members FOR DELETE
USING (
  public.is_organization_owner(auth.uid(), organization_id)
);

-- 7. Add organization_id to projects (THE KEY FIX for the 400 errors)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);

-- 8. Update projects RLS policy to include organization-based access
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own or accessible projects" ON public.projects;

CREATE POLICY "Users can view their own or accessible projects"
ON public.projects FOR SELECT
USING (
  owner_id = auth.uid()
  OR user_has_role_for_project(auth.uid(), id)
  OR (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ))
);

-- 9. Updated_at trigger for organizations (if not exists)
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
