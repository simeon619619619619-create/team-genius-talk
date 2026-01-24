-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Create proper RLS policies for subscriptions
CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);