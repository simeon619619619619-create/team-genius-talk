
-- Add admin policies for viewing all data across the application
-- Admins should be able to view ALL data for management purposes

-- 1. Projects: Admins can view all projects
CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Business Plans: Admins can view all business plans
CREATE POLICY "Admins can view all business plans"
ON public.business_plans
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 3. Plan Steps: Admins can view all plan steps
CREATE POLICY "Admins can view all plan steps"
ON public.plan_steps
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4. Tasks: Admins can view all tasks
CREATE POLICY "Admins can view all tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Subtasks: Admins can view all subtasks
CREATE POLICY "Admins can view all subtasks"
ON public.subtasks
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 6. Teams: Admins can view all teams
CREATE POLICY "Admins can view all teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 7. Team Members: Admins can view all team members
CREATE POLICY "Admins can view all team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 8. Weekly Tasks: Admins can view all weekly tasks
CREATE POLICY "Admins can view all weekly tasks"
ON public.weekly_tasks
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 9. Content Posts: Admins can view all content posts
CREATE POLICY "Admins can view all content posts"
ON public.content_posts
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 10. AI Bots: Admins can view all AI bots
CREATE POLICY "Admins can view all AI bots"
ON public.ai_bots
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 11. Bot Context: Admins can view all bot context
CREATE POLICY "Admins can view all bot context"
ON public.bot_context
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 12. Step Answers: Admins can view all step answers
CREATE POLICY "Admins can view all step answers"
ON public.step_answers
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 13. Step Conversations: Admins can view all step conversations
CREATE POLICY "Admins can view all step conversations"
ON public.step_conversations
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 14. Subscriptions: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
