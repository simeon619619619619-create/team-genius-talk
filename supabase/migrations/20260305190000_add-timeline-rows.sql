-- Add timeline rows (weekly processes) to business plans
ALTER TABLE public.business_plans
ADD COLUMN IF NOT EXISTS timeline_rows JSONB NOT NULL DEFAULT '[]'::jsonb;
