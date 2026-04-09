-- Seed accounts for Founders Club community posting bot.
-- Agents auto-create realistic FC user accounts and store credentials here
-- for later use by a posting-bot agent that seeds community engagement.
create table if not exists public.fc_seed_accounts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password text not null,
  community_slug text default 'bosy-club',
  created_by text default 'health_check_agent',
  created_at timestamptz default now(),
  last_used_at timestamptz,
  posts_count integer default 0
);

alter table public.fc_seed_accounts enable row level security;

drop policy if exists fc_seed_service on public.fc_seed_accounts;
create policy fc_seed_service on public.fc_seed_accounts
  for all to service_role using (true) with check (true);

drop policy if exists fc_seed_owner_read on public.fc_seed_accounts;
create policy fc_seed_owner_read on public.fc_seed_accounts
  for select to authenticated using (true);
