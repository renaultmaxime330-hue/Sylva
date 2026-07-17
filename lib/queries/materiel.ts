"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { Materiel } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchMateriel(): Promise<Materiel[]> {
  const r = await apiFetch("/api/materiel");
  if (!r.ok) await lireErreur(r, "Impossible de charger le matériel.");
  return (await r.json()).materiel;
}
async function fetchMaterielUn(id: string): Promise<Materiel | null> {
  const r = await apiFetch(`/api/materiel/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) await lireErreur(r, "Impossible de charger l'article.");
  return (await r.json()).materiel;
}

export function useMateriel(): UseQueryResult<Materiel[]> {
  return useQuery({ queryKey: ["materiel"], queryFn: fetchMateriel });
}
export function useMaterielUn(id: string): UseQueryResult<Materiel | null> {
  return useQuery({ queryKey: ["materiel", id], queryFn: () => fetchMaterielUn(id), enabled: !!id });
}
