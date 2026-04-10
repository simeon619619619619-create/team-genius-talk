-- ============================================================================
-- POLYMARKET PAPER TRADING — track top wallets, simulate copy trades
-- ============================================================================

-- Wallets we're tracking
create table if not exists public.tracked_wallets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null unique,
  is_active boolean default true,
  last_checked_at timestamptz,
  last_trade_id text, -- last seen trade ID to avoid duplicates
  notes text,
  created_at timestamptz default now()
);

-- Their actual trades (raw from API)
create table if not exists public.wallet_trades (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  trade_id text not null unique, -- polymarket trade ID, dedup key
  market_slug text,
  market_question text,
  outcome text, -- YES / NO
  side text, -- BUY / SELL
  price numeric(10,4) not null,
  size numeric(16,4) not null, -- in USDC
  timestamp timestamptz not null,
  condition_id text,
  raw_json jsonb,
  created_at timestamptz default now()
);

create index if not exists wallet_trades_wallet_ts on public.wallet_trades(wallet_address, timestamp desc);
create index if not exists wallet_trades_trade_id on public.wallet_trades(trade_id);

-- Our simulated paper positions
create table if not exists public.paper_positions (
  id uuid primary key default gen_random_uuid(),
  wallet_source text not null, -- which wallet we're copying
  market_slug text not null,
  market_question text,
  outcome text not null,
  side text not null, -- BUY or SELL
  entry_price numeric(10,4) not null,
  current_price numeric(10,4),
  size_usd numeric(10,2) not null, -- simulated USD amount
  shares numeric(16,4), -- size_usd / entry_price
  pnl_usd numeric(10,2) default 0,
  pnl_pct numeric(8,2) default 0,
  status text default 'open', -- open / closed / resolved
  opened_at timestamptz default now(),
  closed_at timestamptz,
  condition_id text,
  token_id text
);

create index if not exists paper_positions_status on public.paper_positions(status, opened_at desc);

-- P&L snapshots (daily summary)
create table if not exists public.paper_pnl_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  starting_balance numeric(10,2) not null,
  ending_balance numeric(10,2) not null,
  realized_pnl numeric(10,2) default 0,
  unrealized_pnl numeric(10,2) default 0,
  open_positions integer default 0,
  trades_today integer default 0,
  created_at timestamptz default now()
);

-- RLS — service_role only (edge function writes, admin reads)
alter table public.tracked_wallets enable row level security;
alter table public.wallet_trades enable row level security;
alter table public.paper_positions enable row level security;
alter table public.paper_pnl_daily enable row level security;

create policy "service_all" on public.tracked_wallets for all to service_role using (true) with check (true);
create policy "service_all" on public.wallet_trades for all to service_role using (true) with check (true);
create policy "service_all" on public.paper_positions for all to service_role using (true) with check (true);
create policy "service_all" on public.paper_pnl_daily for all to service_role using (true) with check (true);

create policy "auth_read" on public.tracked_wallets for select to authenticated using (true);
create policy "auth_read" on public.wallet_trades for select to authenticated using (true);
create policy "auth_read" on public.paper_positions for select to authenticated using (true);
create policy "auth_read" on public.paper_pnl_daily for select to authenticated using (true);

-- Seed tracked wallets
insert into public.tracked_wallets (name, address, notes) values
  ('ImJustKen', '0x9d84ce0306f8551e02efef1680475fc0f1dc1344', '19K trades, 63% WR, устойчив edge'),
  ('RN1', '', 'Sports algo, 103K trades. Address TBD — resolve via gamma-api on first run')
on conflict (address) do nothing;
