-- Social media platform connections
CREATE TABLE public.social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'whatsapp')),
  page_id text,
  page_name text,
  access_token text,
  webhook_verify_token text DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active boolean DEFAULT true,
  auto_reply boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, platform)
);

-- Conversations from social platforms
CREATE TABLE public.social_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES social_connections(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_user_id text NOT NULL,
  user_name text,
  user_avatar text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at timestamptz DEFAULT now(),
  unread_count int DEFAULT 0,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Individual messages
CREATE TABLE public.social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES social_conversations(id) ON DELETE CASCADE,
  platform text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'sticker', 'story_reply', 'story_mention')),
  external_message_id text,
  is_auto_reply boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

-- Daily statistics per platform
CREATE TABLE public.social_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  platform text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  messages_received int DEFAULT 0,
  messages_sent int DEFAULT 0,
  auto_replies int DEFAULT 0,
  avg_response_time_seconds int,
  new_conversations int DEFAULT 0,
  active_conversations int DEFAULT 0,
  UNIQUE(organization_id, platform, date)
);

-- RLS policies
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_stats ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (organization-level filtering done in app)
CREATE POLICY "Users can manage social connections" ON social_connections FOR ALL USING (true);
CREATE POLICY "Users can view social conversations" ON social_conversations FOR ALL USING (true);
CREATE POLICY "Users can view social messages" ON social_messages FOR ALL USING (true);
CREATE POLICY "Users can view social stats" ON social_stats FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_social_conversations_org ON social_conversations(organization_id, platform);
CREATE INDEX idx_social_conversations_last_msg ON social_conversations(last_message_at DESC);
CREATE INDEX idx_social_messages_conversation ON social_messages(conversation_id, sent_at);
CREATE INDEX idx_social_stats_org_date ON social_stats(organization_id, date DESC);
