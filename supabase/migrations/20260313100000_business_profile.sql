-- Add business_profile JSONB column to profiles for existing business info
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_profile JSONB DEFAULT '{}';
