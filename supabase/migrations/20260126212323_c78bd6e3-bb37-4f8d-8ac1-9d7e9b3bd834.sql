-- Add project_id to tasks table for organization-based filtering
ALTER TABLE public.tasks 
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Update RLS to allow viewing tasks by project access
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;

CREATE POLICY "Users can view their own or project tasks"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (project_id IS NOT NULL AND has_project_access(auth.uid(), project_id))
);