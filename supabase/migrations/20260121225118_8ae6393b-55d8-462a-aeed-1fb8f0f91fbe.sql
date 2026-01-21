-- Create global_bots table for admin-managed bots per step
CREATE TABLE public.global_bots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    step_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_bots ENABLE ROW LEVEL SECURITY;

-- Create security definer function for admin check
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'admin'
    )
$$;

-- Only admins can manage global bots
CREATE POLICY "Admins can manage global bots"
ON public.global_bots
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Everyone can view global bots (instructions filtered in code)
CREATE POLICY "Everyone can view global bots"
ON public.global_bots
FOR SELECT
TO authenticated
USING (true);

-- Add admin-specific policies for profiles table
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can manage all user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_global_bots_updated_at
BEFORE UPDATE ON public.global_bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();