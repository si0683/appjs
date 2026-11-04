-- Таблицы приложения в Supabase (PostgreSQL). Применить: npx supabase db push
-- Каждая таблица — с Row Level Security: пользователь видит и меняет только своё,
-- даже имея публичный ключ приложения.

create type public.trade_side as enum ('buy', 'sell');

-- Журнал сделок (синхронизация с приложением). Деньги — numeric, без потери точности.
create table public.trades (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9]{3,20}$'),
  side public.trade_side not null,
  price numeric(38, 18) not null check (price > 0),
  qty numeric(38, 18) not null check (qty > 0),
  fee numeric(38, 18) not null default 0,
  created_at timestamptz not null default now()
);

create index trades_user_time_idx on public.trades (user_id, created_at desc);

alter table public.trades enable row level security;

create policy "Свои сделки: чтение" on public.trades
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Свои сделки: добавление" on public.trades
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Свои сделки: удаление" on public.trades
  for delete to authenticated using ((select auth.uid()) = user_id);
