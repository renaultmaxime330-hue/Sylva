"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { monEquipe, type MonEquipe } from "@/lib/client/teams";

/** Équipe courante (dont monChefEntreprise) — remplace les appels directs
    à monEquipe() pour que toute l'UI (nav, garde-fous de page) partage le
    même cache et se rafraîchisse ensemble après une création/adhésion/départ. */
export function useMonEquipe(): UseQueryResult<MonEquipe | null> {
  return useQuery({ queryKey: ["equipe"], queryFn: monEquipe });
}
