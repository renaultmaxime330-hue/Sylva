"use client";

import { getSupabase } from "./supabase";
import { monEquipe } from "./team";
import { db, type Chantier, type Geometrie, type KindPartage } from "./db";

/* Partage d'équipe : les chantiers et les tracés de carte sont mis en commun
   entre l'abatteur et le débardeur. Table Supabase `equipe_data` (voir
   supabase-partage.sql).

   Principe :
   — POUSSER : tout ce qui est marqué `syncStatus: "local"` + les suppressions en attente.
   — TIRER : tout ce qui a changé côté serveur depuis le dernier passage (curseur `synced_at`,
     horloge SERVEUR — les horloges de téléphone dérivent).
   — CONFLIT : le plus récent gagne, d'après `updatedAt` (horloge de l'auteur). Avec deux
     personnes qui touchent rarement la même chose au même moment, c'est suffisant et prévisible.

   Hors du partage : photos et documents (trop lourds pour du jsonb — il faudrait Supabase
   Storage), journées, finances, engins, matériel. Chacun garde les siens. */

const CLE_CURSEUR = "sylva-partage-curseur";

interface LigneDistante {
  kind: KindPartage;
  id: string;
  data: Chantier | Geometrie;
  updated_at: string;
  synced_at: string;
  deleted: boolean;
}

export interface ResultatSynchro {
  pousses: number;
  tires: number;
  supprimes: number;
}

function curseur(teamId: string): string {
  try { return localStorage.getItem(`${CLE_CURSEUR}:${teamId}`) ?? "1970-01-01T00:00:00Z"; }
  catch { return "1970-01-01T00:00:00Z"; }
}
function setCurseur(teamId: string, v: string): void {
  try { localStorage.setItem(`${CLE_CURSEUR}:${teamId}`, v); } catch { /* ignore */ }
}

/** Date de dernière modification d'un tracé (les anciens n'ont que createdAt). */
function majGeom(g: Geometrie): string {
  return g.updatedAt ?? g.createdAt;
}

/** Note une suppression pour qu'elle se propage à l'équipe. */
export async function marquerSupprime(kind: KindPartage, id: string): Promise<void> {
  await db.tombes.put({ cle: `${kind}:${id}`, kind, id, at: new Date().toISOString() });
}

/** Suis-je dans une équipe (donc concerné par le partage) ? */
export async function partageDisponible(): Promise<boolean> {
  return !!(await monEquipe().catch(() => null));
}

export async function synchroniser(): Promise<ResultatSynchro | null> {
  const sb = getSupabase();
  if (!sb || !navigator.onLine) return null;
  const eq = await monEquipe().catch(() => null);
  if (!eq) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const teamId = eq.equipe.id;

  const pousses = await pousser(teamId);
  const { tires, supprimes } = await tirer(teamId);
  return { pousses, tires, supprimes };
}

async function pousser(teamId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  const chantiers = await db.chantiers.filter((c) => c.syncStatus === "local").toArray();
  const geoms = await db.geometries.filter((g) => g.syncStatus === "local").toArray();
  const tombes = await db.tombes.toArray();

  const lignes = [
    ...chantiers.map((c) => ({ kind: "chantier", id: c.id, data: c, updated_at: c.updatedAt, deleted: false })),
    ...geoms.map((g) => ({ kind: "geometrie", id: g.id, data: g, updated_at: majGeom(g), deleted: false })),
    ...tombes.map((t) => ({ kind: t.kind, id: t.id, data: {}, updated_at: t.at, deleted: true })),
  ];
  if (lignes.length === 0) return 0;

  // Passe par une fonction serveur : elle refuse d'écraser une version plus récente
  // (un simple upsert écraserait le travail du coéquipier au retour d'une longue coupure).
  const { data: acceptees, error } = await sb.rpc("pousser_equipe_data", { p_team: teamId, p_rows: lignes });
  if (error) throw new Error(error.message);

  // Marqué « synced » seulement après confirmation du serveur
  await db.transaction("rw", [db.chantiers, db.geometries, db.tombes], async () => {
    for (const c of chantiers) await db.chantiers.update(c.id, { syncStatus: "synced" });
    for (const g of geoms) await db.geometries.update(g.id, { syncStatus: "synced" });
    await db.tombes.bulkDelete(tombes.map((t) => t.cle));
  });

  // Des lignes ont été refusées (le serveur avait plus récent) : on récupère les versions
  // gagnantes tout de suite. Sans ça l'appareil garderait sa version périmée en se croyant
  // à jour — le curseur de lecture est déjà passé sur ces lignes, elles ne reviendraient jamais.
  if (typeof acceptees === "number" && acceptees < lignes.length) {
    const { data: gagnantes } = await sb
      .from("equipe_data")
      .select("kind, id, data, updated_at, synced_at, deleted")
      .eq("team_id", teamId)
      .in("id", lignes.map((l) => l.id));
    if (gagnantes) await appliquer(gagnantes as LigneDistante[]);
  }
  return lignes.length;
}

async function tirer(teamId: string): Promise<{ tires: number; supprimes: number }> {
  const sb = getSupabase();
  if (!sb) return { tires: 0, supprimes: 0 };

  const depuis = curseur(teamId);
  const { data, error } = await sb
    .from("equipe_data")
    .select("kind, id, data, updated_at, synced_at, deleted")
    .eq("team_id", teamId)
    .gt("synced_at", depuis)
    .order("synced_at", { ascending: true });
  if (error) throw new Error(error.message);

  const lignes = (data ?? []) as LigneDistante[];
  const r = await appliquer(lignes);
  if (lignes.length) setCurseur(teamId, lignes[lignes.length - 1].synced_at);
  return r;
}

/** Applique des lignes distantes en local. Le plus récent gagne (horloge de l'auteur). */
async function appliquer(lignes: LigneDistante[]): Promise<{ tires: number; supprimes: number }> {
  let tires = 0, supprimes = 0;

  for (const l of lignes) {
    if (l.deleted) {
      if (l.kind === "chantier") {
        if (await db.chantiers.get(l.id)) {
          await db.transaction("rw", [db.chantiers, db.geometries], async () => {
            await db.geometries.where("chantierId").equals(l.id).delete();
            await db.chantiers.delete(l.id);
          });
          supprimes++;
        }
      } else if (await db.geometries.get(l.id)) {
        await db.geometries.delete(l.id);
        supprimes++;
      }
      continue;
    }

    if (l.kind === "chantier") {
      const distant = l.data as Chantier;
      const local = await db.chantiers.get(l.id);
      // Le plus récent gagne
      if (local && local.updatedAt >= distant.updatedAt) continue;
      await db.chantiers.put({ ...distant, syncStatus: "synced" });
      tires++;
    } else {
      const distant = l.data as Geometrie;
      const local = await db.geometries.get(l.id);
      if (local && majGeom(local) >= majGeom(distant)) continue;
      await db.geometries.put({ ...distant, syncStatus: "synced" });
      tires++;
    }
  }

  return { tires, supprimes };
}

/** Repart de zéro : tout retélécharger au prochain passage (changement d'équipe, dépannage). */
export function reinitialiserCurseur(teamId: string): void {
  try { localStorage.removeItem(`${CLE_CURSEUR}:${teamId}`); } catch { /* ignore */ }
}
