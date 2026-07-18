import type { DocCommercial, DocType, LigneDoc, DocStatut } from "./db";
import { DOC_STATUTS } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

export type FactureInput = Omit<DocCommercial, "id" | "createdAt" | "updatedAt">;

export function statutDocInfo(s: DocStatut) {
  return DOC_STATUTS.find((x) => x.value === s) ?? DOC_STATUTS[0];
}

export function ligneVide(): LigneDoc {
  return { designation: "", quantite: 1, unite: "m³", prixUnitaire: 0 };
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["factures"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["factures", id] });
}

/** Numéro suggéré : D-2026-003 / F-2026-012 selon le type et l'année — un
    aperçu, le numéro n'est réellement réservé qu'à la création du document. */
export async function prochainNumero(type: DocType): Promise<string> {
  const r = await apiFetch(`/api/factures/prochain-numero?type=${type}`);
  if (!r.ok) await lireErreur(r, "Impossible de préparer le numéro.");
  const { numero } = await r.json();
  return numero as string;
}

export function champsVidesFacture(type: DocType, numero: string): FactureInput {
  return {
    type, numero, clientId: undefined, clientNom: "", clientAdresse: "", chantierId: undefined,
    date: new Date().toISOString().slice(0, 10),
    dateEcheance: undefined,
    lignes: [ligneVide()],
    tva: 0, notes: "", statut: "brouillon",
  };
}

export async function creerFacture(data: FactureInput): Promise<string> {
  const r = await apiFetch("/api/factures", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer le document.");
  const { facture } = await r.json();
  invalider();
  return facture.id as string;
}

export async function modifierFacture(id: string, data: Partial<FactureInput>): Promise<void> {
  const r = await apiFetch(`/api/factures/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier le document.");
  invalider(id);
}

export async function changerStatutFacture(id: string, statut: DocStatut): Promise<void> {
  const r = await apiFetch(`/api/factures/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }),
  });
  if (!r.ok) await lireErreur(r, "Impossible de changer le statut.");
  invalider(id);
}

export async function supprimerFacture(id: string): Promise<void> {
  const r = await apiFetch(`/api/factures/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer le document.");
  invalider(id);
}

/* ---------- Totaux ---------- */
export interface TotauxDoc {
  ht: number;
  tvaMontant: number;
  ttc: number;
}

export function totalLigne(l: LigneDoc): number {
  return Math.round((l.quantite || 0) * (l.prixUnitaire || 0) * 100) / 100;
}

export function totauxDoc(doc: Pick<DocCommercial, "lignes" | "tva">): TotauxDoc {
  const ht = Math.round(doc.lignes.reduce((s, l) => s + totalLigne(l), 0) * 100) / 100;
  const tvaMontant = Math.round(ht * (doc.tva || 0) / 100 * 100) / 100;
  return { ht, tvaMontant, ttc: Math.round((ht + tvaMontant) * 100) / 100 };
}
