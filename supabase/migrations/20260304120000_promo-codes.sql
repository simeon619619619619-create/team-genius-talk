-- Promo codes table (idempotent)
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  plan_type text not null default 'lifetime',
  max_uses integer null,
  uses_count integer not null default 0,
  expires_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Add active column if missing (older schema uses is_active)
DO $$ BEGIN
  ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- User promo activations table
create table if not exists public.user_promo_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_id uuid not null references public.promo_codes(id),
  activated_at timestamptz not null default now(),
  unique(user_id, code_id)
);

-- RLS
alter table public.promo_codes enable row level security;
alter table public.user_promo_activations enable row level security;

DO $$ BEGIN
  CREATE POLICY "Anyone can read active codes" ON public.promo_codes
    FOR SELECT USING (COALESCE(active, is_active, true));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own activations" ON public.user_promo_activations
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
