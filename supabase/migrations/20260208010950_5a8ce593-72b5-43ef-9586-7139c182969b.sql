
-- Fix swapped arguments in tasks RLS policies

-- DROP existing broken policies
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they have access to" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks they have access to" ON public.tasks;

-- Recreate with correct argument order (_user_id, _project_id)
CREATE POLICY "Users can create their own tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (project_id IS NULL OR has_project_access(auth.uid(), project_id))
);

CREATE POLICY "Users can update tasks they have access to"
ON public.tasks FOR UPDATE
USING (
  auth.uid() = user_id
  OR (project_id IS NOT NULL AND can_edit_project(auth.uid(), project_id))
);

CREATE POLICY "Users can delete tasks they have access to"
ON public.tasks FOR DELETE
USING (
  auth.uid() = user_id
  OR (project_id IS NOT NULL AND can_edit_project(auth.uid(), project_id))
);

-- Fix swapped arguments in subtasks RLS policies
DROP POLICY IF EXISTS "Users can create subtasks for accessible tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can update subtasks of accessible tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks of accessible tasks" ON public.subtasks;

CREATE POLICY "Users can create subtasks for accessible tasks"
ON public.subtasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = subtasks.task_id
    AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND can_edit_project(auth.uid(), t.project_id)))
  )
);

CREATE POLICY "Users can update subtasks of accessible tasks"
ON public.subtasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = subtasks.task_id
    AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND can_edit_project(auth.uid(), t.project_id)))
  )
);

CREATE POLICY "Users can delete subtasks of accessible tasks"
ON public.subtasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = subtasks.task_id
    AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND can_edit_project(auth.uid(), t.project_id)))
  )
);
