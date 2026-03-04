
-- Allow users to view profiles of people in their projects (for team member names)
CREATE POLICY "Users can view profiles of project team members"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = profiles.user_id
    AND has_project_access(auth.uid(), t.project_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.owner_id = profiles.user_id
    AND has_project_access(auth.uid(), p.id)
  )
);
