-- Add source tracking columns to tasks table for bidirectional sync with weekly_tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS source_weekly_task_id uuid REFERENCES public.weekly_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_week_number integer,
ADD COLUMN IF NOT EXISTS source_business_plan_id uuid REFERENCES public.business_plans(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_source_weekly_task_id ON public.tasks(source_weekly_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_business_plan_id ON public.tasks(source_business_plan_id);

-- Add reverse reference in weekly_tasks for bidirectional sync
ALTER TABLE public.weekly_tasks 
ADD COLUMN IF NOT EXISTS linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_linked_task_id ON public.weekly_tasks(linked_task_id);