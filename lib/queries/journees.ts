"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { Journee } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchJournees(): Promise<Journee[]> {
  const r = await apiFetch("/api/journees");
  if (!r.ok) await lireErreur(r, "Impossible de charger les journées.");
  return (await r.json()).journees;
}

async function fetchJournee(id: string): Promise<Journee | null> {
  const r = await apiFetch(`/api/journees/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) await lireErreur(r, "Impossible de charger la journée.");
  return (await r.json()).journee;
}

export function useJournees(): UseQueryResult<Journee[]> {
  return useQuery({ queryKey: ["journees"], queryFn: fetchJournees });
}

export function useJournee(id: string): UseQueryResult<Journee | null> {
  return useQuery({ queryKey: ["journees", id], queryFn: () => fetchJournee(id), enabled: !!id });
}
