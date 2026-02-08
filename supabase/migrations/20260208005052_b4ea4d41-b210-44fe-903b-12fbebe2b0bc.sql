
-- Fix tasks INSERT/UPDATE/DELETE to allow team members with project access
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
CREATE POLICY "Users can create their own tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    project_id IS NULL 
    OR has_project_access(project_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update tasks they have access to"
ON public.tasks FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (project_id IS NOT NULL AND can_edit_project(project_id, auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete tasks they have access to"
ON public.tasks FOR DELETE
USING (
  auth.uid() = user_id 
  OR (project_id IS NOT NULL AND can_edit_project(project_id, auth.uid()))
);

-- Fix subtasks: allow team members who have project access via the parent task
DROP POLICY IF EXISTS "Users can view subtasks of their tasks" ON public.subtasks;
CREATE POLICY "Users can view subtasks of accessible tasks"
ON public.subtasks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.tasks t 
  WHERE t.id = subtasks.task_id 
  AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND has_project_access(t.project_id, auth.uid())))
));

DROP POLICY IF EXISTS "Users can create subtasks for their tasks" ON public.subtasks;
CREATE POLICY "Users can create subtasks for accessible tasks"
ON public.subtasks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks t 
  WHERE t.id = subtasks.task_id 
  AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND can_edit_project(t.project_id, auth.uid())))
));

DROP POLICY IF EXISTS "Users can update subtasks of their tasks" ON public.subtasks;
CREATE POLICY "Users can update subtasks of accessible tasks"
ON public.subtasks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.tasks t 
  WHERE t.id = subtasks.task_id 
  AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND can_edit_project(t.project_id, auth.uid())))
));

DROP POLICY IF EXISTS "Users can delete subtasks of their tasks" ON public.subtasks;
CREATE POLICY "Users can delete subtasks of accessible tasks"
ON public.subtasks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.tasks t 
  WHERE t.id = subtasks.task_id 
  AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND can_edit_project(t.project_id, auth.uid())))
));
