"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { DocCommercial } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchFactures(): Promise<DocCommercial[]> {
  const r = await apiFetch("/api/factures");
  if (!r.ok) await lireErreur(r, "Impossible de charger les documents.");
  return (await r.json()).factures;
}
async function fetchFacture(id: string): Promise<DocCommercial | null> {
  const r = await apiFetch(`/api/factures/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) await lireErreur(r, "Impossible de charger le document.");
  return (await r.json()).facture;
}

export function useFactures(): UseQueryResult<DocCommercial[]> {
  return useQuery({ queryKey: ["factures"], queryFn: fetchFactures });
}
export function useFacture(id: string): UseQueryResult<DocCommercial | null> {
  return useQuery({ queryKey: ["factures", id], queryFn: () => fetchFacture(id), enabled: !!id });
}
