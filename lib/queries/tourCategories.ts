"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { TourCategorie } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchTourCategories(): Promise<TourCategorie[]> {
  const r = await apiFetch("/api/tour-categories");
  if (!r.ok) await lireErreur(r, "Impossible de charger les catégories.");
  return (await r.json()).categories;
}

export function useTourCategories(): UseQueryResult<TourCategorie[]> {
  return useQuery({ queryKey: ["tourCategories"], queryFn: fetchTourCategories });
}
