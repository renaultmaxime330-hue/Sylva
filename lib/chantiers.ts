import type { Chantier, VolumeCategorie } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

/* Accès aux données — création, modification, suppression.
   Passe désormais par l'API du serveur (Postgres/Railway), plus par
   IndexedDB. Les signatures sont conservées à l'identique pour que les
   composants appelants n'aient pas à changer. */

export type ChantierInput = Omit<Chantier, "id" | "createdAt" | "updatedAt">;

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

/* Géolocalisation — Promise autour de l'API navigateur.
   Un seul getCurrentPosition() renvoie souvent le tout premier fix GPS, qui
   est régulièrement le moins bon (la précision s'affine sur les secondes
   suivantes). On écoute donc plusieurs positions successives et on garde la
   plus précise (accuracy la plus basse), jusqu'à un fix jugé assez bon
   (≤ 8 m) ou l'expiration du délai — au pire, on renvoie la meilleure vue
   à défaut d'une excellente. */
const PRECISION_SUFFISANTE_M = 8;
const DELAI_AFFINAGE_MS = 8000;

export function obtenirPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    let meilleure: { lat: number; lng: number; accuracy: number } | null = null;
    let watchId: number | null = null;
    let fini = false;

    function terminer(cb: () => void) {
      if (fini) return;
      fini = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      cb();
    }

    const delai = setTimeout(() => {
      terminer(() => {
        if (meilleure) resolve({ lat: meilleure.lat, lng: meilleure.lng });
        else reject(new Error("Position indisponible pour l'instant."));
      });
    }, DELAI_AFFINAGE_MS);

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const accuracy = p.coords.accuracy;
        if (!meilleure || accuracy < meilleure.accuracy) {
          meilleure = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy };
        }
        if (accuracy <= PRECISION_SUFFISANTE_M) {
          clearTimeout(delai);
          terminer(() => resolve({ lat: meilleure!.lat, lng: meilleure!.lng }));
        }
      },
      (err) => {
        clearTimeout(delai);
        terminer(() => {
          if (meilleure) resolve({ lat: meilleure.lat, lng: meilleure.lng });
          else reject(err);
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: DELAI_AFFINAGE_MS }
    );
  });
}
