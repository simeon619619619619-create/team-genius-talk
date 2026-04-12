CREATE TABLE user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  methodology_data jsonb DEFAULT '{}',
  marketing_plan jsonb DEFAULT '{}',
  business_plan jsonb DEFAULT '{}',
  api_connections jsonb DEFAULT '{}',
  team_config jsonb DEFAULT '{}',
  processes jsonb DEFAULT '{}',
  automation_patterns jsonb DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_memory_unique_user UNIQUE (user_id)
);

CREATE INDEX idx_user_memory_user ON user_memory(user_id);

-- Updated_at trigger (reuses function from previous migration)
CREATE TRIGGER user_memory_updated_at
  BEFORE UPDATE ON user_memory
  FOR EACH ROW EXECUTE FUNCTION update_workflow_updated_at();

-- RLS
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_memory_owner" ON user_memory
  FOR ALL USING (user_id = auth.uid() OR is_admin());

-- Auto-create user_memory row when a new user signs up
CREATE OR REPLACE FUNCTION create_user_memory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_memory (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_memory
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_memory();
