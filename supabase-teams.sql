-- Sylva — Équipes (collaboration abatteur / débardeur)
-- À exécuter dans Supabase → SQL Editor → New query → coller → Run.

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  nom        text,
  code       text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.team_members (
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'debardeur',
  nom        text,
  created_at timestamptz default now(),
  primary key (team_id, user_id)
);

-- Évite la récursion RLS : suis-je membre de cette équipe ? (exécutée en tant que propriétaire)
create or replace function public.est_membre(t uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = t and user_id = auth.uid());
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams for select using (owner_id = auth.uid() or public.est_membre(id));
drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert" on public.teams for insert with check (owner_id = auth.uid());
drop policy if exists "teams_update" on public.teams;
create policy "teams_update" on public.teams for update using (owner_id = auth.uid());
drop policy if exists "teams_delete" on public.teams;
create policy "teams_delete" on public.teams for delete using (owner_id = auth.uid());

drop policy if exists "members_select" on public.team_members;
create policy "members_select" on public.team_members for select using (user_id = auth.uid() or public.est_membre(team_id));
drop policy if exists "members_insert_self" on public.team_members;
create policy "members_insert_self" on public.team_members for insert with check (user_id = auth.uid());
drop policy if exists "members_delete" on public.team_members;
create policy "members_delete" on public.team_members for delete using (
  user_id = auth.uid() or exists (select 1 from public.teams t where t.id = team_members.team_id and t.owner_id = auth.uid())
);

-- Rejoindre une équipe par code (lit l'équipe même si on n'en est pas encore membre).
-- Le rôle vient du profil choisi à la création du compte.
create or replace function public.rejoindre_equipe(p_code text, p_nom text, p_role text default 'debardeur')
returns uuid language plpgsql security definer
set search_path = public as $$
declare t uuid;
begin
  select id into t from public.teams where code = p_code;
  if t is null then raise exception 'Code invalide'; end if;
  insert into public.team_members (team_id, user_id, role, nom)
  values (t, auth.uid(), coalesce(p_role, 'debardeur'), p_nom)
  on conflict (team_id, user_id) do update set nom = excluded.nom, role = excluded.role;
  return t;
end $$;
