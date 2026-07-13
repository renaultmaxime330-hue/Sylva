import { db, newId, type Engin, type Entretien, type EnginType } from "./db";

export type EnginInput = Omit<Engin, "id" | "createdAt" | "updatedAt" | "syncStatus">;

export function champsVidesEngin(): EnginInput {
  return {
    type: "troncon", nom: "", marque: "", modele: "",
    heuresTotal: undefined, coutHoraire: undefined, seuilEntretienH: undefined,
    actif: true, notes: "",
  };
}

export async function creerEngin(data: EnginInput): Promise<string> {
  const now = new Date().toISOString();
  const id = newId();
  await db.engins.add({ ...data, id, createdAt: now, updatedAt: now, syncStatus: "local" });
  return id;
}

export async function modifierEngin(id: string, data: Partial<EnginInput>): Promise<void> {
  await db.engins.update(id, { ...data, updatedAt: new Date().toISOString(), syncStatus: "local" });
}

export async function supprimerEngin(id: string): Promise<void> {
  await db.transaction("rw", db.engins, db.entretiens, async () => {
    await db.entretiens.where("enginId").equals(id).delete();
    await db.engins.delete(id);
  });
}

export type EntretienInput = Omit<Entretien, "id" | "createdAt">;

export async function ajouterEntretien(data: EntretienInput): Promise<void> {
  await db.entretiens.add({ ...data, id: newId(), createdAt: new Date().toISOString() });
  // Met à jour le compteur d'heures de l'engin si l'intervention en fournit un plus élevé
  if (data.heuresCompteur != null) {
    const engin = await db.engins.get(data.enginId);
    if (engin && (engin.heuresTotal == null || data.heuresCompteur > engin.heuresTotal)) {
      await modifierEngin(data.enginId, { heuresTotal: data.heuresCompteur });
    }
  }
}

export async function supprimerEntretien(id: string): Promise<void> {
  await db.entretiens.delete(id);
}

/* ---------- Alerte d'entretien ---------- */
export type NiveauAlerte = "ok" | "bientot" | "depasse" | "aucun";

export interface AlerteEntretien {
  niveau: NiveauAlerte;
  reste?: number;         // heures avant le prochain entretien (négatif = dépassé)
  heuresDepuis?: number;  // heures depuis le dernier entretien
}

/** Dernier compteur d'heures relevé lors d'un entretien/révision. */
function dernierEntretienH(entretiens: Entretien[]): number {
  let max = 0;
  for (const e of entretiens) {
    if ((e.type === "entretien" || e.type === "revision") && e.heuresCompteur != null) {
      max = Math.max(max, e.heuresCompteur);
    }
  }
  return max;
}

export function alerteEntretien(engin: Engin, entretiens: Entretien[]): AlerteEntretien {
  if (!engin.seuilEntretienH || engin.seuilEntretienH <= 0 || engin.heuresTotal == null) {
    return { niveau: "aucun" };
  }
  const depuis = engin.heuresTotal - dernierEntretienH(entretiens);
  const reste = Math.round((engin.seuilEntretienH - depuis) * 10) / 10;
  let niveau: NiveauAlerte = "ok";
  if (reste <= 0) niveau = "depasse";
  else if (reste <= Math.max(5, engin.seuilEntretienH * 0.15)) niveau = "bientot";
  return { niveau, reste, heuresDepuis: Math.round(depuis * 10) / 10 };
}

/* ---------- Démo ---------- */
export async function amorcerDemoEngins(): Promise<void> {
  const count = await db.engins.count();
  if (count > 0) return;
  const now = new Date().toISOString();
  const mk = (type: EnginType, nom: string, marque: string, h: number, cout: number, seuil: number): Engin => ({
    id: newId(), type, nom, marque, modele: "", heuresTotal: h, coutHoraire: cout,
    seuilEntretienH: seuil, actif: true, notes: "", createdAt: now, updatedAt: now, syncStatus: "local",
  });
  const troncon = mk("troncon", "Tronçonneuse 1", "Stihl", 248, 12, 50);
  const abatteuse = mk("abatteuse", "Abatteuse", "Ponsse", 1180, 145, 250);
  const debardeur = mk("debardeur", "Débardeur", "John Deere", 3420, 95, 500);
  await db.engins.bulkAdd([troncon, abatteuse, debardeur]);
  // Un entretien passé sur l'abatteuse (compteur à 1000 → 180 h depuis, seuil 250 → OK)
  await db.entretiens.add({
    id: newId(), enginId: abatteuse.id, type: "revision", date: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10),
    heuresCompteur: 1000, cout: 850, carburantL: undefined, huile: true, notes: "Révision 1000 h", createdAt: now,
  });
}
