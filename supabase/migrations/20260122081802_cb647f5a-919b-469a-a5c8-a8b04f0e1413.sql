-- Add day_of_week column to tasks table for daily task organization
ALTER TABLE public.tasks 
ADD COLUMN day_of_week INTEGER CHECK (day_of_week >= 1 AND day_of_week <= 7);

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.day_of_week IS 'Day of week (1=Monday, 7=Sunday) for daily task scheduling';