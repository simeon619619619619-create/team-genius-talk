-- Promo codes table
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  plan_type text not null default 'lifetime',
  max_uses integer null,
  uses_count integer not null default 0,
  expires_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- User promo activations table
create table public.user_promo_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_id uuid not null references public.promo_codes(id),
  activated_at timestamptz not null default now(),
  unique(user_id, code_id)
);

-- RLS
alter table public.promo_codes enable row level security;
alter table public.user_promo_activations enable row level security;

create policy "Anyone can read active codes" on public.promo_codes
  for select using (active = true);

create policy "Users can read own activations" on public.user_promo_activations
  for select using (auth.uid() = user_id);

-- Insert initial promo code
insert into public.promo_codes (code, plan_type, max_uses, active)
values ('SIMORA2026', 'lifetime', null, true);
