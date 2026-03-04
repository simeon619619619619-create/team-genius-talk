CREATE TABLE public.ghl_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  location_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.ghl_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own GHL integration"
ON public.ghl_integrations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
