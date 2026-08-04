"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";

/* Persiste le cache React Query dans localStorage — les dernières données
   chargées (chantiers, carte, production…) restent consultables en lecture
   seule en forêt sans réseau, plutôt que de tout perdre au moindre F5.
   Aucune donnée nouvelle (une écriture nécessite toujours le serveur) : ce
   n'est qu'un instantané des dernières lectures réussies.

   Ce module tourne côté client ET côté serveur (rendu SSR d'un composant
   "use client") — `window` n'existe pas pendant le rendu serveur, d'où ce
   persisteur inerte en repli. Brancher un vrai/faux persisteur ne change
   que la valeur d'une prop (pas le DOM rendu), donc pas de risque de
   désaccord d'hydratation entre serveur et client. */
const INERTE: Persister = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
};

export function creerPersister(): Persister {
  if (typeof window === "undefined") return INERTE;
  return createSyncStoragePersister({ storage: window.localStorage, key: "sylva-query-cache" });
}
