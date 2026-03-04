
-- Fix get_invitation_by_token to validate expiry and usage status
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
BEGIN
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
      AND ti.used_at IS NULL
      AND ti.expires_at > NOW()
    LIMIT 1;
    
    RETURN result;
END;
$function$;
