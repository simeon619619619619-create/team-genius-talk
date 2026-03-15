CREATE TABLE IF NOT EXISTS site_pageviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL,
  url text DEFAULT '',
  path text DEFAULT '/',
  referrer text DEFAULT '',
  screen text DEFAULT '',
  language text DEFAULT '',
  user_agent text DEFAULT '',
  country text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pageviews_site_id ON site_pageviews(site_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_created_at ON site_pageviews(created_at);
CREATE INDEX IF NOT EXISTS idx_pageviews_path ON site_pageviews(site_id, path);

ALTER TABLE site_pageviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_pageviews' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON site_pageviews FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_pageviews' AND policyname = 'Anon can insert pageviews') THEN
    CREATE POLICY "Anon can insert pageviews" ON site_pageviews FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_pageviews' AND policyname = 'Authenticated can read pageviews') THEN
    CREATE POLICY "Authenticated can read pageviews" ON site_pageviews FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
