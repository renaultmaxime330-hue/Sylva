"use client";

import { QueryClient } from "@tanstack/react-query";

/* Instance unique, importable aussi bien par le <QueryProvider> (React) que
   par les fonctions de mutation "plates" dans lib/*.ts (creerChantier,
   supprimerEngin…) qui doivent invalider le cache sans être elles-mêmes
   des hooks React. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
});
