-- Fix swapped arguments in subtasks SELECT policy
DROP POLICY IF EXISTS "Users can view subtasks of accessible tasks" ON public.subtasks;

CREATE POLICY "Users can view subtasks of accessible tasks"
ON public.subtasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = subtasks.task_id
    AND (t.user_id = auth.uid() OR (t.project_id IS NOT NULL AND has_project_access(auth.uid(), t.project_id)))
  )
);