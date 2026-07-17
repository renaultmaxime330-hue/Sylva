"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { Chantier } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchChantiers(): Promise<Chantier[]> {
  const r = await apiFetch("/api/chantiers");
  if (!r.ok) await lireErreur(r, "Impossible de charger les chantiers.");
  return (await r.json()).chantiers;
}

async function fetchChantier(id: string): Promise<Chantier | null> {
  const r = await apiFetch(`/api/chantiers/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) await lireErreur(r, "Impossible de charger le chantier.");
  return (await r.json()).chantier;
}

/** Liste des chantiers de l'équipe — remplace useLiveQuery(() => db.chantiers...). */
export function useChantiers(): UseQueryResult<Chantier[]> {
  return useQuery({ queryKey: ["chantiers"], queryFn: fetchChantiers });
}

export function useChantier(id: string): UseQueryResult<Chantier | null> {
  return useQuery({ queryKey: ["chantiers", id], queryFn: () => fetchChantier(id), enabled: !!id });
}

/** À appeler après toute mutation (créer/modifier/supprimer) pour rafraîchir les listes. */
export function useInvalidateChantiers() {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: ["chantiers"] }); };
}
