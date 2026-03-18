-- Track methodology module completion
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS methodology_completed boolean NOT NULL DEFAULT false;

-- Track individual module completion per user
CREATE TABLE IF NOT EXISTS public.module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  chat_summary text, -- AI-extracted key insights from the module conversation
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own module completions"
  ON public.module_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
