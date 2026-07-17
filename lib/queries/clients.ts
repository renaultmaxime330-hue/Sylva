"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client/auth";
import type { Client } from "@/lib/db";

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

async function fetchClients(): Promise<Client[]> {
  const r = await apiFetch("/api/clients");
  if (!r.ok) await lireErreur(r, "Impossible de charger les clients.");
  return (await r.json()).clients;
}

async function fetchClient(id: string): Promise<Client | null> {
  const r = await apiFetch(`/api/clients/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) await lireErreur(r, "Impossible de charger le client.");
  return (await r.json()).client;
}

export function useClients(): UseQueryResult<Client[]> {
  return useQuery({ queryKey: ["clients"], queryFn: fetchClients });
}

export function useClient(id: string): UseQueryResult<Client | null> {
  return useQuery({ queryKey: ["clients", id], queryFn: () => fetchClient(id), enabled: !!id });
}
