-- Migration: chat_roles_kpi
-- Creates: custom_roles, conversations, messages, kpi_entries

-- =====================
-- TABLE: custom_roles
-- =====================
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  permissions JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_custom_roles_updated_at ON public.custom_roles;
DROP TRIGGER IF EXISTS set_conversations_updated_at ON public.conversations;
DROP TRIGGER IF EXISTS set_kpi_entries_updated_at ON public.kpi_entries;
DROP POLICY IF EXISTS "Members can view custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Editors can manage custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Creator can update/delete conversation" ON public.conversations;
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Author can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Members can view kpi entries" ON public.kpi_entries;
DROP POLICY IF EXISTS "Members can create kpi entries" ON public.kpi_entries;
DROP POLICY IF EXISTS "Editors can update/delete kpi entries" ON public.kpi_entries;

CREATE POLICY "Members can view custom roles" ON public.custom_roles
  FOR SELECT USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Editors can manage custom roles" ON public.custom_roles
  FOR ALL USING (public.can_edit_project(auth.uid(), project_id))
  WITH CHECK (public.can_edit_project(auth.uid(), project_id));

CREATE TRIGGER set_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- TABLE: conversations
-- =====================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Members can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Creator can update/delete conversation" ON public.conversations
  FOR ALL USING (
    created_by = auth.uid() OR public.can_edit_project(auth.uid(), project_id)
  );

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- TABLE: messages
-- =====================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND public.has_project_access(auth.uid(), c.project_id)
    )
  );

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND public.has_project_access(auth.uid(), c.project_id)
    )
  );

CREATE POLICY "Author can delete own messages" ON public.messages
  FOR DELETE USING (user_id = auth.uid());

-- =====================
-- TABLE: kpi_entries
-- =====================
CREATE TABLE IF NOT EXISTS public.kpi_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  period DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view kpi entries" ON public.kpi_entries
  FOR SELECT USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Members can create kpi entries" ON public.kpi_entries
  FOR INSERT WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Editors can update/delete kpi entries" ON public.kpi_entries
  FOR ALL USING (public.can_edit_project(auth.uid(), project_id))
  WITH CHECK (public.can_edit_project(auth.uid(), project_id));

CREATE TRIGGER set_kpi_entries_updated_at
  BEFORE UPDATE ON public.kpi_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
