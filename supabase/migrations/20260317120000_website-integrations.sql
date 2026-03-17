-- Website integrations for bot Елена to edit user websites
CREATE TABLE IF NOT EXISTS public.website_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('wordpress', 'shopify', 'vercel', 'custom')),
  site_url text NOT NULL,
  api_key text NOT NULL,
  api_username text, -- for WordPress Basic Auth
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, site_url)
);

ALTER TABLE public.website_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own website integrations"
ON public.website_integrations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
