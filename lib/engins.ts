import type { Engin, Entretien } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

export type EnginInput = Omit<Engin, "id" | "createdAt" | "updatedAt" | "syncStatus">;

export function champsVidesEngin(): EnginInput {
  return {
    type: "troncon", nom: "", marque: "", modele: "",
    heuresTotal: undefined, seuilEntretienH: undefined,
    actif: true, notes: "",
  };
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invaliderEngins(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["engins"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["engins", id] });
}
function invaliderEntretiens(enginId: string) {
  void queryClient.invalidateQueries({ queryKey: ["entretiens", enginId] });
  void queryClient.invalidateQueries({ queryKey: ["entretiens", "tous"] });
  invaliderEngins(enginId); // le compteur d'heures de l'engin peut avoir changé
}

export async function creerEngin(data: EnginInput): Promise<string> {
  const r = await apiFetch("/api/engins", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer l'engin.");
  const { engin } = await r.json();
  invaliderEngins();
  return engin.id as string;
}

export async function modifierEngin(id: string, data: Partial<EnginInput>): Promise<void> {
  const r = await apiFetch(`/api/engins/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier l'engin.");
  invaliderEngins(id);
}

export async function supprimerEngin(id: string): Promise<void> {
  const r = await apiFetch(`/api/engins/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer l'engin.");
  invaliderEngins(id);
}

export type EntretienInput = Omit<Entretien, "id" | "createdAt">;

export async function ajouterEntretien(data: EntretienInput): Promise<void> {
  const r = await apiFetch("/api/entretiens", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible d'enregistrer l'entretien.");
  invaliderEntretiens(data.enginId);
}

export async function supprimerEntretien(id: string, enginId: string): Promise<void> {
  const r = await apiFetch(`/api/entretiens/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer l'entretien.");
  invaliderEntretiens(enginId);
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
