"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { NotifType } from "@/lib/db";

/** Forme servie par l'API — `lu` est un vrai booléen Postgres (contrairement
    à l'ancien `0 | 1` de Dexie, qui n'indexait pas les booléens). */
export interface NotifServeur {
  id: string;
  type: NotifType;
  titre: string;
  detail: string;
  href: string | null;
  cle: string;
  lu: boolean;
  createdAt: string;
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchNotifs(): Promise<NotifServeur[]> {
  const r = await apiFetch("/api/notifs");
  if (!r.ok) await lireErreur(r, "Impossible de charger les alertes.");
  return (await r.json()).notifs;
}

export function useNotifs(): UseQueryResult<NotifServeur[]> {
  return useQuery({ queryKey: ["notifs"], queryFn: fetchNotifs });
}
