-- ============================================================================
-- AGENTS DASHBOARD — local dashboard for viewing scheduled agents and runs
-- ============================================================================

-- Agents table: definition of a scheduled task
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  task_prompt text not null,
  schedule_cron text not null default '0 8 * * *',
  timezone text not null default 'Europe/Sofia',
  is_active boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agents_owner_idx on public.agents(owner_id);
create index if not exists agents_active_idx on public.agents(is_active);

-- Runs table: history of every execution
create type public.agent_run_status as enum ('running', 'success', 'error', 'cancelled');

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status public.agent_run_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  output_summary text,
  error_message text,
  triggered_by text default 'schedule', -- 'schedule' | 'manual'
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_agent_idx on public.agent_runs(agent_id, started_at desc);
create index if not exists agent_runs_owner_idx on public.agent_runs(owner_id, started_at desc);

-- Update trigger for agents.updated_at
create or replace function public.agents_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agents_updated_at on public.agents;
create trigger agents_updated_at
  before update on public.agents
  for each row execute function public.agents_set_updated_at();

-- ============================================================================
-- RLS — owners can only see and manage their own agents + runs
-- ============================================================================

alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;

drop policy if exists "agents_owner_select" on public.agents;
create policy "agents_owner_select" on public.agents
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "agents_owner_insert" on public.agents;
create policy "agents_owner_insert" on public.agents
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "agents_owner_update" on public.agents;
create policy "agents_owner_update" on public.agents
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "agents_owner_delete" on public.agents;
create policy "agents_owner_delete" on public.agents
  for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "agent_runs_owner_select" on public.agent_runs;
create policy "agent_runs_owner_select" on public.agent_runs
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "agent_runs_owner_insert" on public.agent_runs;
create policy "agent_runs_owner_insert" on public.agent_runs
  for insert to authenticated
  with check (owner_id = auth.uid());

-- Service role bypass (for scheduled agents running in cloud to log their runs)
drop policy if exists "agent_runs_service_all" on public.agent_runs;
create policy "agent_runs_service_all" on public.agent_runs
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "agents_service_all" on public.agents;
create policy "agents_service_all" on public.agents
  for all to service_role
  using (true)
  with check (true);
