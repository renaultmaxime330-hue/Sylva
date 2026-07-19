"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMonEquipe } from "@/lib/queries/equipe";

/* Bloque une section entière (compta, factures) aux membres qui ne sont pas
   chef d'entreprise — la navigation les cache déjà, ceci couvre l'accès
   direct par URL. Renvoie discrètement vers le tableau de bord, sans écran
   explicite : la section doit simplement ne pas exister pour eux, pas
   afficher un message "réservé". Le vrai verrou reste côté serveur
   (contexteEquipeChef), ce composant n'est qu'une question de discrétion. */
export default function GardeChef({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: equipe, isLoading } = useMonEquipe();
  const autorise = equipe?.monChefEntreprise ?? false;

  useEffect(() => {
    if (!isLoading && !autorise) router.replace("/");
  }, [isLoading, autorise, router]);

  if (isLoading || !autorise) return null;

  return <>{children}</>;
}
