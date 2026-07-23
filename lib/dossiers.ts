import type { ChantierDossier } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

/* Dossiers pour ranger/trier les chantiers — purement organisationnel,
   aucun calcul, aucun impact sur le reste de l'app hormis l'étiquette. */

export type DossierInput = Omit<ChantierDossier, "id" | "createdAt" | "updatedAt">;

export function champsVidesDossier(ordre = 0): DossierInput {
  return { nom: "", couleur: "#2E6B41", ordre };
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["dossiers"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["dossiers", id] });
}

export async function creerDossier(data: DossierInput): Promise<string> {
  const r = await apiFetch("/api/dossiers", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer le dossier.");
  const { dossier } = await r.json();
  invalider();
  return dossier.id as string;
}

export async function modifierDossier(id: string, data: Partial<DossierInput>): Promise<void> {
  const r = await apiFetch(`/api/dossiers/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier le dossier.");
  invalider(id);
}

export async function supprimerDossier(id: string): Promise<void> {
  const r = await apiFetch(`/api/dossiers/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer le dossier.");
  invalider(id);
  void queryClient.invalidateQueries({ queryKey: ["chantiers"] });
}
