-- Update the get_invitation_by_token function to include project_id in team data
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Only return invitation data if token is valid, not expired, and not used
    SELECT jsonb_build_object(
        'invitation', jsonb_build_object(
            'id', ti.id,
            'token', ti.token,
            'expires_at', ti.expires_at,
            'used_at', ti.used_at,
            'team_member_id', ti.team_member_id
        ),
        'team_member', jsonb_build_object(
            'id', tm.id,
            'team_id', tm.team_id,
            'email', tm.email,
            'role', tm.role,
            'status', tm.status
        ),
        'team', jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'description', t.description,
            'project_id', t.project_id
        )
    ) INTO result
    FROM public.team_invitations ti
    JOIN public.team_members tm ON tm.id = ti.team_member_id
    JOIN public.teams t ON t.id = tm.team_id
    WHERE ti.token = _token
    LIMIT 1;
    
    RETURN result;
END;
$$;