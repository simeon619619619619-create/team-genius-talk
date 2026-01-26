-- Add workspace_name field to profiles for personal workspace naming
ALTER TABLE public.profiles 
ADD COLUMN workspace_name text DEFAULT 'Личен workspace';