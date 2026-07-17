-- Sylva — Partage des chantiers & des cartes au sein d'une équipe.
-- À exécuter dans Supabase → SQL Editor → New query → coller → Run.
-- (Supabase peut afficher « Potential issue detected » à cause des `drop policy` :
--  c'est normal, ils ne suppriment que des règles recréées juste après. Cliquer « Run query ».)
--
-- Nécessite supabase-teams.sql (tables teams / team_members + fonction est_membre).

create table if not exists public.equipe_data (
  team_id    uuid not null references public.teams(id) on delete cascade,
  kind       text not null,                        -- 'chantier' | 'geometrie'
  id         text not null,                        -- identifiant local (app)
  data       jsonb not null,                       -- l'enregistrement complet
  updated_at timestamptz not null,                 -- horloge de l'AUTEUR : arbitre les conflits
  synced_at  timestamptz not null default now(),   -- horloge du SERVEUR : curseur de lecture
  deleted    boolean not null default false,       -- pierre tombale
  updated_by uuid references auth.users(id),
  primary key (team_id, kind, id)
);

-- Curseur de lecture : « donne-moi tout ce qui a changé depuis ma dernière synchro »
create index if not exists equipe_data_curseur on public.equipe_data (team_id, synced_at);

-- synced_at est posé par le serveur, jamais par le client (horloges de téléphone non fiables)
create or replace function public.touch_synced_at()
returns trigger language plpgsql as $$
begin
  new.synced_at = now();
  return new;
end $$;

drop trigger if exists equipe_data_touch on public.equipe_data;
create trigger equipe_data_touch before insert or update on public.equipe_data
for each row execute function public.touch_synced_at();

alter table public.equipe_data enable row level security;

-- Tout membre de l'équipe lit et écrit les données de SON équipe, et rien d'autre.
drop policy if exists "equipe_data_select" on public.equipe_data;
create policy "equipe_data_select" on public.equipe_data for select using (public.est_membre(team_id));
drop policy if exists "equipe_data_insert" on public.equipe_data;
create policy "equipe_data_insert" on public.equipe_data for insert with check (public.est_membre(team_id));
drop policy if exists "equipe_data_update" on public.equipe_data;
create policy "equipe_data_update" on public.equipe_data for update using (public.est_membre(team_id));

-- Écriture : n'écrase JAMAIS une version plus récente.
-- Sans ce garde-fou, un appareil resté hors-ligne longtemps écraserait au retour du réseau
-- le travail plus récent du coéquipier (le `where` sur DO UPDATE ignore simplement la ligne périmée).
create or replace function public.pousser_equipe_data(p_team uuid, p_rows jsonb)
returns integer language plpgsql security invoker
set search_path = public as $$
declare n integer := 0;
begin
  insert into public.equipe_data (team_id, kind, id, data, updated_at, deleted, updated_by)
  select p_team,
         r->>'kind',
         r->>'id',
         coalesce(r->'data', '{}'::jsonb),
         (r->>'updated_at')::timestamptz,
         coalesce((r->>'deleted')::boolean, false),
         auth.uid()
  from jsonb_array_elements(p_rows) as r
  on conflict (team_id, kind, id) do update
    set data       = excluded.data,
        updated_at = excluded.updated_at,
        deleted    = excluded.deleted,
        updated_by = excluded.updated_by
    where equipe_data.updated_at < excluded.updated_at;
  get diagnostics n = row_count;
  return n;
end $$;
