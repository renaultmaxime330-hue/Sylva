"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { Finance } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchFinances(): Promise<Finance[]> {
  const r = await apiFetch("/api/finances");
  if (!r.ok) await lireErreur(r, "Impossible de charger la comptabilité.");
  return (await r.json()).finances;
}
async function fetchFinance(id: string): Promise<Finance | null> {
  const r = await apiFetch(`/api/finances/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) await lireErreur(r, "Impossible de charger l'écriture.");
  return (await r.json()).finance;
}

export function useFinances(): UseQueryResult<Finance[]> {
  return useQuery({ queryKey: ["finances"], queryFn: fetchFinances });
}
export function useFinance(id: string): UseQueryResult<Finance | null> {
  return useQuery({ queryKey: ["finances", id], queryFn: () => fetchFinance(id), enabled: !!id });
}
