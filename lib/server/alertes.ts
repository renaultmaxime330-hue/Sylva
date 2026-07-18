import type { engins, entretiens, materiel } from "./db/schema";

/* Copie serveur des déductions d'alerte (pures) : les originaux
   (lib/engins.ts, lib/materiel.ts) ne sont pas réutilisables tels quels ici
   — ils importent aussi apiFetch/queryClient ("use client"), même précaution
   que lib/server/geo.ts pour surfaceHa/longueurM (éviter tout import de code
   client côté serveur, même si ça ne planterait pas forcément). */

type Engin = typeof engins.$inferSelect;
type Entretien = typeof entretiens.$inferSelect;
type Materiel = typeof materiel.$inferSelect;

export type NiveauAlerte = "ok" | "bientot" | "depasse" | "aucun";

export interface AlerteEntretien {
  niveau: NiveauAlerte;
  reste?: number;
  heuresDepuis?: number;
}

/** Dernier compteur d'heures relevé lors d'un entretien/révision. */
function dernierEntretienH(entretiensEngin: Entretien[]): number {
  let max = 0;
  for (const e of entretiensEngin) {
    if ((e.type === "entretien" || e.type === "revision") && e.heuresCompteur != null) {
      max = Math.max(max, e.heuresCompteur);
    }
  }
  return max;
}

export function alerteEntretien(engin: Engin, entretiensEngin: Entretien[]): AlerteEntretien {
  if (!engin.seuilEntretienH || engin.seuilEntretienH <= 0 || engin.heuresTotal == null) {
    return { niveau: "aucun" };
  }
  const depuis = engin.heuresTotal - dernierEntretienH(entretiensEngin);
  const reste = Math.round((engin.seuilEntretienH - depuis) * 10) / 10;
  let niveau: NiveauAlerte = "ok";
  if (reste <= 0) niveau = "depasse";
  else if (reste <= Math.max(5, engin.seuilEntretienH * 0.15)) niveau = "bientot";
  return { niveau, reste, heuresDepuis: Math.round(depuis * 10) / 10 };
}

export function stockBas(m: Materiel): boolean {
  return m.seuilAlerte != null && m.quantite <= m.seuilAlerte;
}
