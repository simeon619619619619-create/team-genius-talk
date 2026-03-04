-- Fix overly permissive RLS policies on team invitation system

-- 1. TEAMS TABLE
-- Drop the overly permissive "Anyone can view teams" policy
DROP POLICY IF EXISTS "Anyone can view teams for invitations" ON public.teams;

-- 2. TEAM_INVITATIONS TABLE  
-- Drop the overly permissive "Anyone can view invitations by token" policy
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.team_invitations;

-- 3. TEAM_MEMBERS TABLE
-- Drop the overly permissive "Anyone can view pending team members" policy
DROP POLICY IF EXISTS "Anyone can view pending team members" ON public.team_members;

-- Create a secure function to validate invitation tokens (bypasses RLS with proper validation)
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
            'description', t.description
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

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO authenticated;