"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { ChantierDossier } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchDossiers(): Promise<ChantierDossier[]> {
  const r = await apiFetch("/api/dossiers");
  if (!r.ok) await lireErreur(r, "Impossible de charger les dossiers.");
  return (await r.json()).dossiers;
}

export function useDossiers(): UseQueryResult<ChantierDossier[]> {
  return useQuery({ queryKey: ["dossiers"], queryFn: fetchDossiers });
}
