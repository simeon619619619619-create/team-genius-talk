-- Add tag palette for business plan timeline rows
ALTER TABLE public.business_plans
ADD COLUMN IF NOT EXISTS timeline_tags JSONB NOT NULL DEFAULT '[]'::jsonb;
