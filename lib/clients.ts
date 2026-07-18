import type { Client, Chantier } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt">;

export function champsVidesClient(): ClientInput {
  return { nom: "", adresse: "", commune: "", telephone: "", email: "", notes: "" };
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["clients"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["clients", id] });
}

export async function creerClient(data: ClientInput): Promise<string> {
  const r = await apiFetch("/api/clients", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer le client.");
  const { client } = await r.json();
  invalider();
  return client.id as string;
}

export async function modifierClient(id: string, data: Partial<ClientInput>): Promise<void> {
  const r = await apiFetch(`/api/clients/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier le client.");
  invalider(id);
}

export async function supprimerClient(id: string): Promise<void> {
  const r = await apiFetch(`/api/clients/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer le client.");
  invalider(id);
}

function norm(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Chantiers rattachés à un client (par correspondance du nom sur propriétaire ou client). */
export function chantiersDeClient(client: Client, chantiers: Chantier[]): Chantier[] {
  const n = norm(client.nom);
  if (!n) return [];
  return chantiers.filter((c) => {
    const p = norm(c.proprietaire), cl = norm(c.client);
    return p === n || cl === n || (p.length > 2 && p.includes(n)) || (cl.length > 2 && cl.includes(n));
  });
}
