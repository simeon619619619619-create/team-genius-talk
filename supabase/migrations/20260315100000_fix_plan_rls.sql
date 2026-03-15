-- Fix plan_steps RLS policies - simplify to avoid nested RLS through projects table
-- The old policies did: EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND has_project_access(auth.uid(), p.id))
-- This triggers projects table RLS (which also calls has_project_access), causing nested evaluation issues
-- New policies call has_project_access directly on the project_id column

-- plan_steps: DROP and recreate SELECT/INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Users can view plan steps for their projects" ON public.plan_steps;
DROP POLICY IF EXISTS "Users can create plan steps for their projects" ON public.plan_steps;
DROP POLICY IF EXISTS "Users can update plan steps for their projects" ON public.plan_steps;
DROP POLICY IF EXISTS "Users can delete plan steps for their projects" ON public.plan_steps;

CREATE POLICY "Users can view plan steps for their projects"
ON public.plan_steps FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can create plan steps for their projects"
ON public.plan_steps FOR INSERT
WITH CHECK (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can update plan steps for their projects"
ON public.plan_steps FOR UPDATE
USING (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can delete plan steps for their projects"
ON public.plan_steps FOR DELETE
USING (can_edit_project(auth.uid(), project_id));

-- step_conversations: DROP and recreate
DROP POLICY IF EXISTS "Users can view step conversations for their projects" ON public.step_conversations;
DROP POLICY IF EXISTS "Users can create step conversations for their projects" ON public.step_conversations;
DROP POLICY IF EXISTS "Users can delete step conversations for their projects" ON public.step_conversations;

CREATE POLICY "Users can view step conversations for their projects"
ON public.step_conversations FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can create step conversations for their projects"
ON public.step_conversations FOR INSERT
WITH CHECK (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can delete step conversations for their projects"
ON public.step_conversations FOR DELETE
USING (can_edit_project(auth.uid(), project_id));

-- step_answers: DROP and recreate
DROP POLICY IF EXISTS "Users can view step answers for their projects" ON public.step_answers;
DROP POLICY IF EXISTS "Users can create step answers for their projects" ON public.step_answers;
DROP POLICY IF EXISTS "Users can update step answers for their projects" ON public.step_answers;
DROP POLICY IF EXISTS "Users can delete step answers for their projects" ON public.step_answers;

CREATE POLICY "Users can view step answers for their projects"
ON public.step_answers FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can create step answers for their projects"
ON public.step_answers FOR INSERT
WITH CHECK (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can update step answers for their projects"
ON public.step_answers FOR UPDATE
USING (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can delete step answers for their projects"
ON public.step_answers FOR DELETE
USING (can_edit_project(auth.uid(), project_id));

-- ai_bots: DROP and recreate
DROP POLICY IF EXISTS "Users can view bots for their projects" ON public.ai_bots;
DROP POLICY IF EXISTS "Users can create bots for their projects" ON public.ai_bots;
DROP POLICY IF EXISTS "Users can update bots for their projects" ON public.ai_bots;
DROP POLICY IF EXISTS "Users can delete bots for their projects" ON public.ai_bots;

CREATE POLICY "Users can view bots for their projects"
ON public.ai_bots FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can create bots for their projects"
ON public.ai_bots FOR INSERT
WITH CHECK (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can update bots for their projects"
ON public.ai_bots FOR UPDATE
USING (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can delete bots for their projects"
ON public.ai_bots FOR DELETE
USING (can_edit_project(auth.uid(), project_id));

-- bot_context: DROP and recreate
DROP POLICY IF EXISTS "Users can view bot context for their projects" ON public.bot_context;
DROP POLICY IF EXISTS "Users can create bot context for their projects" ON public.bot_context;
DROP POLICY IF EXISTS "Users can update bot context for their projects" ON public.bot_context;
DROP POLICY IF EXISTS "Users can delete bot context for their projects" ON public.bot_context;

CREATE POLICY "Users can view bot context for their projects"
ON public.bot_context FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can create bot context for their projects"
ON public.bot_context FOR INSERT
WITH CHECK (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can update bot context for their projects"
ON public.bot_context FOR UPDATE
USING (can_edit_project(auth.uid(), project_id));

CREATE POLICY "Users can delete bot context for their projects"
ON public.bot_context FOR DELETE
USING (can_edit_project(auth.uid(), project_id));
