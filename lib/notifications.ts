import { db, newId, type Notif, type NotifType } from "./db";
import { alerteEntretien } from "./engins";
import { stockBas } from "./materiel";

/* Centre d'alertes. Tout vit en local (IndexedDB) : ça marche hors-ligne.
   Deux sources :
   — les alertes DÉDUITES des données (entretien, stock, fin de chantier), rafraîchies
     périodiquement et auto-résorbées quand la cause disparaît (entretien fait, stock refait) ;
   — les événements REÇUS de l'équipe en temps réel (modif de la carte), voir lib/canal.ts.
   La `cle` évite les doublons : une même cause = une seule alerte. */

export async function creerNotif(
  type: NotifType, cle: string, titre: string, detail: string, href?: string
): Promise<void> {
  const existe = await db.notifs.where("cle").equals(cle).first();
  if (existe) return;
  await db.notifs.add({
    id: newId(), type, cle, titre, detail, href,
    lu: 0, createdAt: new Date().toISOString(),
  });
}

/** Retire les alertes dont la cause a disparu (préfixe de clé). */
async function retirerParPrefixe(prefixe: string, garder: Set<string>): Promise<void> {
  const toutes = await db.notifs.toArray();
  const aSupprimer = toutes.filter((n) => n.cle.startsWith(prefixe) && !garder.has(n.cle)).map((n) => n.id);
  if (aSupprimer.length) await db.notifs.bulkDelete(aSupprimer);
}

/** Recalcule les alertes déduites des données locales. Idempotent. */
export async function rafraichirAlertes(): Promise<void> {
  const vivantes = new Set<string>();

  // 1) Entretien des engins
  const engins = await db.engins.toArray();
  for (const e of engins.filter((x) => x.actif)) {
    const ents = await db.entretiens.where("enginId").equals(e.id).toArray();
    const a = alerteEntretien(e, ents);
    if (a.niveau !== "bientot" && a.niveau !== "depasse") continue;
    const cle = `entretien:${e.id}:${a.niveau}`;
    vivantes.add(cle);
    await creerNotif(
      "entretien", cle,
      a.niveau === "depasse" ? `Entretien dépassé — ${e.nom}` : `Entretien bientôt — ${e.nom}`,
      a.niveau === "depasse"
        ? `${Math.abs(a.reste ?? 0)} h au-delà du seuil (${e.seuilEntretienH} h).`
        : `Encore ${a.reste} h avant l'entretien des ${e.seuilEntretienH} h.`,
      `/engins/${e.id}`
    );
  }
  await retirerParPrefixe("entretien:", vivantes);

  // 2) Stock bas
  const mats = await db.materiel.toArray();
  for (const m of mats.filter(stockBas)) {
    const cle = `stock:${m.id}`;
    vivantes.add(cle);
    await creerNotif(
      "stock", cle, `Stock bas — ${m.nom}`,
      `Il reste ${m.quantite} ${m.unite} (seuil ${m.seuilAlerte}).`,
      `/materiel`
    );
  }
  await retirerParPrefixe("stock:", vivantes);

  // 3) Chantiers terminés — on garde la trace même après (pas de retrait)
  const termines = await db.chantiers.where("statut").equals("termine").toArray();
  for (const c of termines) {
    await creerNotif(
      "chantier", `chantier:${c.id}:termine`, `Chantier terminé — ${c.nom}`,
      "Pense à saisir les volumes par catégorie et à facturer.",
      `/chantiers/${c.id}`
    );
  }
}

export async function marquerLu(id: string): Promise<void> {
  await db.notifs.update(id, { lu: 1 });
}

export async function marquerToutLu(): Promise<void> {
  await db.notifs.where("lu").equals(0).modify({ lu: 1 });
}

export async function supprimerNotif(id: string): Promise<void> {
  await db.notifs.delete(id);
}

export async function viderNotifs(): Promise<void> {
  await db.notifs.clear();
}

export function notifInfo(t: NotifType): { label: string; couleur: string } {
  switch (t) {
    case "entretien": return { label: "Entretien", couleur: "var(--danger)" };
    case "stock": return { label: "Stock", couleur: "var(--wood)" };
    case "chantier": return { label: "Chantier", couleur: "var(--accent)" };
    case "carte": return { label: "Carte", couleur: "#2563EB" };
  }
}

export function quand(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export type { Notif };
