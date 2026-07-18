import type { Materiel } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

export type MaterielInput = Omit<Materiel, "id" | "createdAt" | "updatedAt">;

export function champsVidesMateriel(): MaterielInput {
  return { categorie: "chaine", nom: "", quantite: 0, unite: "u", seuilAlerte: undefined, notes: "" };
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["materiel"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["materiel", id] });
}

export async function creerMateriel(data: MaterielInput): Promise<string> {
  const r = await apiFetch("/api/materiel", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer l'article.");
  const { materiel } = await r.json();
  invalider();
  return materiel.id as string;
}

export async function modifierMateriel(id: string, data: Partial<MaterielInput>): Promise<void> {
  const r = await apiFetch(`/api/materiel/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier l'article.");
  invalider(id);
}

export async function supprimerMateriel(id: string): Promise<void> {
  const r = await apiFetch(`/api/materiel/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer l'article.");
  invalider(id);
}

/** Ajuste la quantité (delta + ou -), sans passer sous 0. Atomique côté serveur
    (SQL direct, pas lecture-puis-écriture) — résiste aux clics rapides. */
export async function ajusterQuantite(id: string, delta: number): Promise<void> {
  const r = await apiFetch(`/api/materiel/${id}/quantite`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delta }),
  });
  if (!r.ok) await lireErreur(r, "Impossible d'ajuster la quantité.");
  invalider(id);
}

export function stockBas(m: Materiel): boolean {
  return m.seuilAlerte != null && m.quantite <= m.seuilAlerte;
}
