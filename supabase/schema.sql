-- ============================================================================
-- 居酒屋開拓マップ (Izakaya Map) - Supabase Schema & RLS
-- ============================================================================

-- UUID拡張の有効化
create extension if not exists "uuid-ossp";

-- 1. izakayas テーブル作成
create table if not exists public.izakayas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  genres text[] not null default '{}',
  lat double precision not null,
  lng double precision not null,
  area text not null default '',
  address text not null default '',
  smoking text not null default 'no_smoking' check (smoking in ('all', 'separated', 'heated_only', 'no_smoking')),
  rating smallint not null default 3 check (rating between 1 and 5),
  visit_count integer not null default 0 check (visit_count >= 0),
  specialty text not null default '',
  memo text not null default '',
  visited boolean not null default false,
  created_at timestamptz not null default now()
);

-- インデックス作成（検索・フィルタ高速化）
create index if not exists idx_izakayas_user_id on public.izakayas(user_id);
create index if not exists idx_izakayas_visited on public.izakayas(user_id, visited);
create index if not exists idx_izakayas_genres on public.izakayas using gin(genres);

-- 2. Row Level Security (RLS) の有効化
alter table public.izakayas enable row level security;

-- 3. 自分専用 (auth.uid() = user_id) の厳格なRLSポリシー定義
create policy "izakayas_select_own"
  on public.izakayas
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "izakayas_insert_own"
  on public.izakayas
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "izakayas_update_own"
  on public.izakayas
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "izakayas_delete_own"
  on public.izakayas
  for delete
  to authenticated
  using (auth.uid() = user_id);
