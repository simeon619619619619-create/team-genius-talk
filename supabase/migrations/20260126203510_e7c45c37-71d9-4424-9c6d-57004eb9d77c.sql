-- Add user_type to profiles (worker = cannot create orgs, owner = can create orgs)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type text CHECK (user_type IN ('worker', 'owner')),
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they own or are members of"
ON public.organizations FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = organizations.id AND user_id = auth.uid()
    )
);

CREATE POLICY "Owners can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid() 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND user_type = 'owner'
    )
    -- Limit to 3 organizations per user
    AND (SELECT COUNT(*) FROM public.organizations WHERE owner_id = auth.uid()) < 3
);

CREATE POLICY "Owners can update their organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- RLS Policies for organization_members
CREATE POLICY "Members can view organization members"
ON public.organization_members FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_members.organization_id 
        AND om.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_members.organization_id 
        AND o.owner_id = auth.uid()
    )
);

CREATE POLICY "Organization owners and admins can add members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_id AND o.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_id 
        AND om.user_id = auth.uid() 
        AND om.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Organization owners and admins can remove members"
ON public.organization_members FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_id AND o.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_id 
        AND om.user_id = auth.uid() 
        AND om.role IN ('owner', 'admin')
    )
);

-- Create trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user is organization owner
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

-- Function to get user's organization count
CREATE OR REPLACE FUNCTION public.get_user_organization_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::integer FROM public.organizations WHERE owner_id = _user_id
$$;