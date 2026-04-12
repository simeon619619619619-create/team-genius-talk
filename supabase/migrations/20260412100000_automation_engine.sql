-- Enums
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE workflow_trigger_type AS ENUM ('manual', 'cron', 'event', 'webhook', 'ai_suggestion');
CREATE TYPE workflow_node_type AS ENUM ('trigger', 'ai_task', 'condition', 'delay', 'human_approval', 'action', 'end');
CREATE TYPE workflow_execution_status AS ENUM ('running', 'paused', 'completed', 'failed', 'cancelled');
CREATE TYPE workflow_event_status AS ENUM ('pending', 'running', 'done', 'error', 'skipped');
CREATE TYPE workflow_learning_type AS ENUM ('optimization', 'bottleneck', 'pattern', 'error_prevention');

-- Workflows
CREATE TABLE workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  trigger_type workflow_trigger_type NOT NULL DEFAULT 'manual',
  trigger_config jsonb DEFAULT '{}',
  mind_map_json jsonb DEFAULT '{"nodes":[],"edges":[]}',
  status workflow_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workflow nodes (normalized for execution engine)
CREATE TABLE workflow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  type workflow_node_type NOT NULL,
  bot_id text,
  label text NOT NULL DEFAULT '',
  task_prompt text DEFAULT '',
  tool_permissions text[] DEFAULT '{}',
  config jsonb DEFAULT '{}',
  position_x float DEFAULT 0,
  position_y float DEFAULT 0,
  sort_order int DEFAULT 0
);

-- Workflow executions (one per run)
CREATE TABLE workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status workflow_execution_status NOT NULL DEFAULT 'running',
  trigger_source text DEFAULT 'manual',
  input_data jsonb DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int
);

-- Workflow events (one per node per execution = the event queue)
CREATE TABLE workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status workflow_event_status NOT NULL DEFAULT 'pending',
  bot_id text,
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  tool_calls jsonb DEFAULT '[]',
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms int
);

-- Learning (AI analysis of past executions)
CREATE TABLE workflow_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type workflow_learning_type NOT NULL,
  suggestion text NOT NULL,
  applied boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workflows_owner ON workflows(owner_id);
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_owner ON workflow_executions(owner_id);
CREATE INDEX idx_workflow_events_execution ON workflow_events(execution_id);
CREATE INDEX idx_workflow_events_status ON workflow_events(status);
CREATE INDEX idx_workflow_learning_workflow ON workflow_learning(workflow_id);

-- Updated_at trigger for workflows
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_workflow_updated_at();

-- RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_learning ENABLE ROW LEVEL SECURITY;

-- Workflows: owner or admin
CREATE POLICY "workflows_owner" ON workflows
  FOR ALL USING (owner_id = auth.uid() OR is_admin());

-- Nodes: via workflow ownership
CREATE POLICY "workflow_nodes_owner" ON workflow_nodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_id AND (w.owner_id = auth.uid() OR is_admin()))
  );

-- Executions: owner or admin
CREATE POLICY "workflow_executions_owner" ON workflow_executions
  FOR ALL USING (owner_id = auth.uid() OR is_admin());

-- Events: owner or admin
CREATE POLICY "workflow_events_owner" ON workflow_events
  FOR ALL USING (owner_id = auth.uid() OR is_admin());

-- Learning: owner or admin
CREATE POLICY "workflow_learning_owner" ON workflow_learning
  FOR ALL USING (owner_id = auth.uid() OR is_admin());

-- Enable realtime for workflow_events (live mind map updates)
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_events;
