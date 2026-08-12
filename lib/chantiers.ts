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

/* Commune et parcelle cadastrale correspondant à une position, via notre
   propre route serveur (voir app/api/geocode/route.ts pour le choix des
   services et de la CSP). Ne lève jamais : c'est un confort de saisie, pas
   une donnée dont dépend l'enregistrement du chantier. */
export interface InfosPosition {
  commune: string | null;
  parcelle: string | null;
}

export async function infosDepuisPosition(lat: number, lng: number): Promise<InfosPosition> {
  const vide: InfosPosition = { commune: null, parcelle: null };
  try {
    const r = await apiFetch(`/api/geocode?lat=${lat}&lng=${lng}`);
    if (!r.ok) return vide;
    const { commune, parcelle } = await r.json();
    return {
      commune: typeof commune === "string" && commune ? commune : null,
      parcelle: typeof parcelle === "string" && parcelle ? parcelle : null,
    };
  } catch {
    return vide;
  }
}

/* Géolocalisation — Promise autour de l'API navigateur.

   Le premier fix GPS est régulièrement le moins bon (la précision s'affine
   sur les secondes suivantes) : on écoute donc plusieurs positions et on
   garde la plus précise, jusqu'à un fix satisfaisant ou l'échéance.

   Deux garde-fous, appris d'une version précédente qui échouait en forêt :
   - le délai doit être large. Sous couvert forestier ou GPS froid, un fix
     haute précision « tout frais » peut demander plus de 10 s ; trop court,
     watchPosition renvoie une erreur TIMEOUT et on repartait les mains vides.
   - une position approximative est demandée en parallèle, comme filet. Elle
     ne sert JAMAIS à conclure en avance (une position en cache pourrait
     dater d'un autre chantier) : uniquement de repli à l'échéance si le GPS
     précis n'a rien donné. Mieux vaut une position à 500 m à corriger qu'un
     message d'erreur au milieu d'une parcelle.
   On ne rejette donc que si l'autorisation est refusée ou si absolument
   aucune position n'a pu être obtenue. */
const PRECISION_CIBLE_M = 10;
const DELAI_TOTAL_MS = 20000;

export function obtenirPosition(
  surProgres?: (precisionM: number) => void
): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    type Fix = { lat: number; lng: number; accuracy: number };
    let meilleure: Fix | null = null;
    let repli: Fix | null = null;
    let watchId: number | null = null;
    let refusee = false;
    let watchMort = false;
    let fini = false;

    function finir() {
      if (fini) return;
      fini = true;
      clearTimeout(delai);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      const choisie = meilleure ?? repli;
      if (refusee) reject(new Error("Autorise la localisation pour enregistrer ta position."));
      else if (choisie) resolve({ lat: choisie.lat, lng: choisie.lng });
      else reject(new Error("Position indisponible — vérifie que le GPS est activé, puis réessaie."));
    }

    const delai = setTimeout(finir, DELAI_TOTAL_MS);

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const accuracy = p.coords.accuracy;
        if (!meilleure || accuracy < meilleure.accuracy) {
          meilleure = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy };
          surProgres?.(Math.round(accuracy));
        }
        if (accuracy <= PRECISION_CIBLE_M) finir();
      },
      (err) => {
        // Autorisation refusée : insister ne sert à rien, on s'arrête net.
        if (err.code === err.PERMISSION_DENIED) { refusee = true; finir(); return; }
        // TIMEOUT / POSITION_UNAVAILABLE : non fatal, mais le GPS précis ne
        // donnera plus rien. Inutile d'attendre l'échéance si on a déjà de
        // quoi répondre — sinon on laisse au repli le temps d'arriver.
        watchMort = true;
        if (meilleure ?? repli) finir();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: DELAI_TOTAL_MS }
    );

    navigator.geolocation.getCurrentPosition(
      (p) => {
        repli = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        if (watchMort) finir(); // le GPS précis a déjà renoncé : ce repli est notre réponse
      },
      (err) => { if (err.code === err.PERMISSION_DENIED) { refusee = true; finir(); } },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: DELAI_TOTAL_MS }
    );
  });
}
