-- Track marketing plan completion
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_completed boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
