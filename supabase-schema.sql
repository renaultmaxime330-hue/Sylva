-- Sylva — table de sauvegarde cloud (à exécuter dans Supabase → SQL Editor)
-- Chaque compte a une seule ligne contenant toutes ses données (jsonb),
-- accessible uniquement par son propriétaire (Row Level Security).

create table if not exists public.cloud_backups (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cloud_backups enable row level security;

create policy "backup_select_own" on public.cloud_backups
  for select using (auth.uid() = user_id);

create policy "backup_insert_own" on public.cloud_backups
  for insert with check (auth.uid() = user_id);

create policy "backup_update_own" on public.cloud_backups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "backup_delete_own" on public.cloud_backups
  for delete using (auth.uid() = user_id);
