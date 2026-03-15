-- Business Directory: база данни с фирми по ниши за продажба на студенти
create table if not exists public.business_niches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text, -- emoji or icon name
  created_at timestamptz default now()
);

create table if not exists public.business_directory (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid references public.business_niches(id) on delete set null,
  company_name text not null,
  website text,
  email text,
  phone text,
  instagram text,
  facebook text,
  linkedin text,
  address text,
  city text,
  country text default 'България',
  description text,
  employee_count text, -- e.g. "1-10", "11-50", "51-200"
  revenue_range text,  -- e.g. "< 100k", "100k-500k"
  contact_person text,
  contact_role text,
  tags text[] default '{}',
  source text, -- where the data was collected from
  verified boolean default false,
  collected_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_business_directory_niche on public.business_directory(niche_id);
create index idx_business_directory_city on public.business_directory(city);
create index idx_business_directory_country on public.business_directory(country);
create index idx_business_directory_verified on public.business_directory(verified);
create index idx_business_directory_created on public.business_directory(created_at);

-- RLS
alter table public.business_niches enable row level security;
alter table public.business_directory enable row level security;

-- Admins can do everything
create policy "Admins can manage niches" on public.business_niches
  for all using (
    auth.uid() in (
      select user_id from public.user_roles where role = 'admin'
    )
    or auth.jwt()->>'email' in ('info@eufashioninstitute.com', 'simeon619619619619@gmail.com')
  );

create policy "Admins can manage directory" on public.business_directory
  for all using (
    auth.uid() in (
      select user_id from public.user_roles where role = 'admin'
    )
    or auth.jwt()->>'email' in ('info@eufashioninstitute.com', 'simeon619619619619@gmail.com')
  );

-- Subscribers can read directory
create policy "Subscribers can read niches" on public.business_niches
  for select using (
    auth.uid() in (
      select user_id from public.subscriptions where status = 'active'
    )
  );

create policy "Subscribers can read directory" on public.business_directory
  for select using (
    auth.uid() in (
      select user_id from public.subscriptions where status = 'active'
    )
  );

-- Seed initial niches
insert into public.business_niches (name, description, icon) values
  ('Ресторанти и кафенета', 'Заведения за хранене и напитки', '🍽️'),
  ('Фитнес и спорт', 'Фитнес зали, спортни клубове, треньори', '💪'),
  ('Красота и козметика', 'Салони за красота, козметични студия', '💄'),
  ('Мода и облекло', 'Магазини за дрехи, бутици, модни брандове', '👗'),
  ('Здраве и медицина', 'Клиники, лекари, аптеки', '🏥'),
  ('Образование', 'Училища, курсове, академии', '📚'),
  ('IT и технологии', 'Софтуерни компании, уеб агенции', '💻'),
  ('Недвижими имоти', 'Агенции, брокери, строителни фирми', '🏠'),
  ('Автомобили', 'Автокъщи, сервизи, части', '🚗'),
  ('Туризъм и хотели', 'Хотели, турагенции, екскурзии', '✈️'),
  ('Юридически услуги', 'Адвокати, нотариуси, счетоводители', '⚖️'),
  ('Маркетинг и реклама', 'Дигитални агенции, PR, реклама', '📢'),
  ('Е-commerce', 'Онлайн магазини, дропшипинг', '🛒'),
  ('Фотография и видео', 'Фотографи, видеографи, студия', '📸'),
  ('Събития и кетъринг', 'Организатори, кетъринг, DJ', '🎉')
on conflict (name) do nothing;

-- Notify PostgREST to reload schema
notify pgrst, 'reload schema';
