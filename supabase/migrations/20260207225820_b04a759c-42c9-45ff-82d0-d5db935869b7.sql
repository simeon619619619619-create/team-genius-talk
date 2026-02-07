
-- Update can_edit_project to include accepted team members (keeping same parameter order)
CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id
        UNION
        SELECT 1 FROM public.user_roles WHERE project_id = _project_id AND user_id = _user_id AND role IN ('owner', 'editor')
        UNION
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON t.id = tm.team_id
        WHERE t.project_id = _project_id AND tm.user_id = _user_id AND tm.status = 'accepted'
    )
$$;

-- Create member_permissions for all existing accepted team members without them
INSERT INTO public.member_permissions (team_member_id, can_view_tasks, can_view_business_plan, can_view_annual_plan, can_view_all)
SELECT tm.id, true, true, true, true
FROM public.team_members tm
LEFT JOIN public.member_permissions mp ON mp.team_member_id = tm.id
WHERE mp.id IS NULL AND tm.status = 'accepted';
