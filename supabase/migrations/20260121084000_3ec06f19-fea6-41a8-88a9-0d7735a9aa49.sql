-- Create teams table
CREATE TABLE public.teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member',
    status text NOT NULL DEFAULT 'pending',
    invited_at timestamptz NOT NULL DEFAULT now(),
    accepted_at timestamptz,
    invited_by uuid REFERENCES auth.users(id)
);

-- Create team invitations table for tracking invitation tokens
CREATE TABLE public.team_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they have access to"
ON public.teams FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users with edit access can create teams"
ON public.teams FOR INSERT
WITH CHECK (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users with edit access can update teams"
ON public.teams FOR UPDATE
USING (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users with edit access can delete teams"
ON public.teams FOR DELETE
USING (can_edit_project(auth.uid(), project_id));

-- Team members policies
CREATE POLICY "Users can view team members of their teams"
ON public.team_members FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
    AND has_project_access(auth.uid(), t.project_id)
));

CREATE POLICY "Users can invite to their teams"
ON public.team_members FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
    AND can_edit_project(auth.uid(), t.project_id)
));

CREATE POLICY "Users can update members of their teams"
ON public.team_members FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
    AND can_edit_project(auth.uid(), t.project_id)
));

CREATE POLICY "Users can remove members from their teams"
ON public.team_members FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
    AND can_edit_project(auth.uid(), t.project_id)
));

-- Team invitations policies (public access for accepting invitations)
CREATE POLICY "Anyone can view invitation by token"
ON public.team_invitations FOR SELECT
USING (true);

CREATE POLICY "Users can create invitations for their teams"
ON public.team_invitations FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.id = team_invitations.team_member_id
    AND can_edit_project(auth.uid(), t.project_id)
));

CREATE POLICY "Users can update invitations"
ON public.team_invitations FOR UPDATE
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
