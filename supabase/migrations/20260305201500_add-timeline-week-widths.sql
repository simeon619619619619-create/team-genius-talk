-- Add per-week column widths for business plan timeline (spreadsheet-like resize)
ALTER TABLE public.business_plans
ADD COLUMN IF NOT EXISTS timeline_week_widths JSONB NOT NULL DEFAULT '[]'::jsonb;
