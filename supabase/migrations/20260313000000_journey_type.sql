-- Add journey_type to profiles
alter table profiles
  add column if not exists journey_type text check (journey_type in ('automation', 'startup'));

-- Automation projects table
create table if not exists automation_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null, -- crm, email, social, invoicing, support, other
  status text not null default 'planning' check (status in ('planning', 'active', 'paused', 'done')),
  description text,
  roi_estimate text,
  tools text[], -- list of tools used
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table automation_projects enable row level security;
create policy "Users manage own automation projects"
  on automation_projects for all using (auth.uid() = user_id);

-- Startup milestones table
create table if not exists startup_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  phase text not null check (phase in ('idea', 'validation', 'planning', 'launch', 'growth')),
  title text not null,
  description text,
  completed boolean default false,
  order_index int default 0,
  created_at timestamptz default now()
);

alter table startup_milestones enable row level security;
create policy "Users manage own startup milestones"
  on startup_milestones for all using (auth.uid() = user_id);
