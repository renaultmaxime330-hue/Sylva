import type { Chantier, VolumeCategorie } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

/* Accès aux données — création, modification, suppression.
   Passe désormais par l'API du serveur (Postgres/Railway), plus par
   IndexedDB. Les signatures sont conservées à l'identique pour que les
   composants appelants n'aient pas à changer. */

export type ChantierInput = Omit<Chantier, "id" | "createdAt" | "updatedAt" | "syncStatus">;

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["chantiers"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["chantiers", id] });
}

export async function creerChantier(data: ChantierInput): Promise<string> {
  const r = await apiFetch("/api/chantiers", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer le chantier.");
  const { chantier } = await r.json();
  invalider();
  return chantier.id as string;
}

export async function modifierChantier(id: string, data: Partial<ChantierInput>): Promise<void> {
  const r = await apiFetch(`/api/chantiers/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier le chantier.");
  invalider(id);
}

export async function majVolumes(id: string, volumes: VolumeCategorie[]): Promise<void> {
  await modifierChantier(id, { volumes });
}

export async function marquerTermine(id: string): Promise<void> {
  await modifierChantier(id, { statut: "termine" });
}

export async function supprimerChantier(id: string): Promise<void> {
  const r = await apiFetch(`/api/chantiers/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer le chantier.");
  invalider(id);
}

/* Géolocalisation — Promise autour de l'API navigateur. */
export function obtenirPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}
