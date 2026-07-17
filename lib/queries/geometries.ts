"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { Geometrie } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchGeometries(chantierId: string): Promise<Geometrie[]> {
  const r = await apiFetch(`/api/geometries?chantierId=${encodeURIComponent(chantierId)}`);
  if (!r.ok) await lireErreur(r, "Impossible de charger les tracés.");
  return (await r.json()).geometries;
}

export function useGeometries(chantierId: string): UseQueryResult<Geometrie[]> {
  return useQuery({
    queryKey: ["geometries", chantierId],
    queryFn: () => fetchGeometries(chantierId),
    enabled: !!chantierId,
  });
}
