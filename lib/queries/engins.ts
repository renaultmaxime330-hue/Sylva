"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { Engin, Entretien } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchEngins(): Promise<Engin[]> {
  const r = await apiFetch("/api/engins");
  if (!r.ok) await lireErreur(r, "Impossible de charger les engins.");
  return (await r.json()).engins;
}
async function fetchEngin(id: string): Promise<Engin | null> {
  const r = await apiFetch(`/api/engins/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) await lireErreur(r, "Impossible de charger l'engin.");
  return (await r.json()).engin;
}
async function fetchEntretiens(enginId?: string): Promise<Entretien[]> {
  const r = await apiFetch(enginId ? `/api/entretiens?enginId=${encodeURIComponent(enginId)}` : "/api/entretiens");
  if (!r.ok) await lireErreur(r, "Impossible de charger les entretiens.");
  return (await r.json()).entretiens;
}

export function useEngins(): UseQueryResult<Engin[]> {
  return useQuery({ queryKey: ["engins"], queryFn: fetchEngins });
}
export function useEngin(id: string): UseQueryResult<Engin | null> {
  return useQuery({ queryKey: ["engins", id], queryFn: () => fetchEngin(id), enabled: !!id });
}
/** Sans enginId : tous les entretiens de l'équipe (utile pour les alertes). */
export function useEntretiens(enginId?: string): UseQueryResult<Entretien[]> {
  return useQuery({ queryKey: ["entretiens", enginId ?? "tous"], queryFn: () => fetchEntretiens(enginId) });
}
