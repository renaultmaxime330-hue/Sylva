"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMonEquipe } from "@/lib/queries/equipe";
import { IcLock } from "@/lib/icons";

/* Bloque une section entière (compta, factures) aux membres qui ne sont
   pas chef d'entreprise — la navigation les cache déjà, ceci couvre l'accès
   direct par URL. Le vrai verrou reste côté serveur (contexteEquipeChef) :
   ceci évite juste un écran d'erreur confus si quelqu'un force le lien. */
export default function GardeChef({ children }: { children: ReactNode }) {
  const { data: equipe, isLoading } = useMonEquipe();

  if (isLoading) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  if (!equipe?.monChefEntreprise) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcLock /></div>
        <h3>Réservé au chef d&apos;entreprise</h3>
        <p>Cette section n&apos;est visible que par le chef d&apos;entreprise de l&apos;équipe.</p>
        <Link href="/" className="btn primary big">Retour au tableau de bord</Link>
      </div>
    );
  }

  return <>{children}</>;
}
