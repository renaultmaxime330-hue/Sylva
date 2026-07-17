import type { Finance } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

export type FinanceInput = Omit<Finance, "id" | "createdAt" | "updatedAt" | "syncStatus">;

export const CAT_RECETTES = ["Vente de bois", "Acompte", "Subvention", "Autre recette"];
export const CAT_DEPENSES = ["Carburant", "Entretien machine", "Main-d'œuvre", "Location", "Pièces", "Assurance", "Autre dépense"];

export function champsVidesFinance(chantierId = ""): FinanceInput {
  return { chantierId: chantierId || undefined, type: "recette", categorie: "", libelle: "", montant: 0, date: new Date().toISOString().slice(0, 10) };
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["finances"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["finances", id] });
}

export async function creerFinance(data: FinanceInput): Promise<string> {
  const r = await apiFetch("/api/finances", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer l'écriture.");
  const { finance } = await r.json();
  invalider();
  return finance.id as string;
}

export async function modifierFinance(id: string, data: Partial<FinanceInput>): Promise<void> {
  const r = await apiFetch(`/api/finances/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier l'écriture.");
  invalider(id);
}

export async function supprimerFinance(id: string): Promise<void> {
  const r = await apiFetch(`/api/finances/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer l'écriture.");
  invalider(id);
}

export interface Bilan {
  recettes: number;
  depenses: number;
  marge: number;
  rentabilite: number | undefined; // marge / recettes en %
}

export function bilan(lignes: Finance[]): Bilan {
  let recettes = 0, depenses = 0;
  for (const l of lignes) {
    if (l.type === "recette") recettes += l.montant;
    else depenses += l.montant;
  }
  recettes = Math.round(recettes * 100) / 100;
  depenses = Math.round(depenses * 100) / 100;
  const marge = Math.round((recettes - depenses) * 100) / 100;
  return { recettes, depenses, marge, rentabilite: recettes > 0 ? Math.round((marge / recettes) * 1000) / 10 : undefined };
}
