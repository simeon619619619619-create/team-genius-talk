-- Create member permissions table for granular access control
CREATE TABLE public.member_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    can_view_tasks boolean NOT NULL DEFAULT false,
    can_view_business_plan boolean NOT NULL DEFAULT false,
    can_view_annual_plan boolean NOT NULL DEFAULT false,
    can_view_all boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(team_member_id)
);

-- Enable RLS
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_member_permissions_updated_at
    BEFORE UPDATE ON public.member_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Project owners/editors can manage permissions
CREATE POLICY "Project editors can manage member permissions"
ON public.member_permissions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.id = member_permissions.team_member_id
        AND can_edit_project(auth.uid(), t.project_id)
    )
);

-- Team members can view their own permissions
CREATE POLICY "Members can view own permissions"
ON public.member_permissions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.id = member_permissions.team_member_id
        AND tm.user_id = auth.uid()
    )
);

-- Admins can view all
CREATE POLICY "Admins can view all member permissions"
ON public.member_permissions
FOR SELECT
USING (is_admin(auth.uid()));

-- Create function to check member access to specific section
CREATE OR REPLACE FUNCTION public.member_has_section_access(
    _user_id uuid,
    _project_id uuid,
    _section text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        -- Owner always has access
        SELECT 1 FROM projects WHERE id = _project_id AND owner_id = _user_id
        UNION
        -- Check user_roles (editor/admin have full access)
        SELECT 1 FROM user_roles 
        WHERE project_id = _project_id 
        AND user_id = _user_id 
        AND role IN ('owner', 'editor', 'admin')
        UNION
        -- Check team member permissions
        SELECT 1 FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        LEFT JOIN member_permissions mp ON mp.team_member_id = tm.id
        WHERE t.project_id = _project_id
        AND tm.user_id = _user_id
        AND tm.status = 'accepted'
        AND (
            mp.can_view_all = true
            OR (
                CASE _section
                    WHEN 'tasks' THEN mp.can_view_tasks
                    WHEN 'business_plan' THEN mp.can_view_business_plan
                    WHEN 'annual_plan' THEN mp.can_view_annual_plan
                    ELSE false
                END
            )
        )
    )
$$;