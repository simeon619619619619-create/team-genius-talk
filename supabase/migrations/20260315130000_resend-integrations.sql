CREATE TABLE public.resend_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.resend_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own Resend integration"
ON public.resend_integrations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
