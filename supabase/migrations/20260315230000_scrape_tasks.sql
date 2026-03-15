-- Async scrape tasks queue for local agent
create table if not exists public.scrape_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  niche text not null,
  city text not null default 'София',
  niche_id uuid references public.business_niches(id) on delete set null,
  max_results int default 20,
  results_count int default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Only admin users can manage scrape tasks
alter table public.scrape_tasks enable row level security;

create policy "Admins can manage scrape_tasks" on public.scrape_tasks
  for all using (
    auth.uid() in (
      select user_id from public.user_roles where role = 'admin'
    )
    or auth.jwt()->>'email' in ('info@eufashioninstitute.com', 'simeon619619619619@gmail.com')
  );

create index idx_scrape_tasks_status on public.scrape_tasks(status);
create index idx_scrape_tasks_user on public.scrape_tasks(user_id);

notify pgrst, 'reload schema';
