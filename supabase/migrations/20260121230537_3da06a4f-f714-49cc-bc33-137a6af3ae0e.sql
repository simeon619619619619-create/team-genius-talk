-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create a simpler policy that allows users to see their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);
