import { and, eq } from "drizzle-orm";
import { db } from "./db/client";
import { engins, entretiens, materiel, chantiers } from "./db/schema";
import { alerteEntretien, stockBas } from "./alertes";
import { creerNotifServeur, retirerNotifsParPrefixe } from "./notifs";

/* Recalcul des alertes DÉDUITES des données (entretien, stock, chantier
   terminé) — remplace l'ancien lib/notifications.ts:rafraichirAlertes() qui
   tournait en polling local contre Dexie. Ici, appelé en tâche de fond
   (fire-and-forget, jamais attendu par la route appelante) après chaque
   mutation susceptible de faire apparaître/disparaître une alerte — pas de
   timer/cron : à cette échelle, recalculer à la demande est largement assez
   rapide et évite d'itérer toutes les équipes périodiquement. Idempotent. */
export async function recalculerAlertes(teamId: string): Promise<void> {
  try {
    // 1) Entretien des engins
    const tousEngins = await db.select().from(engins).where(eq(engins.teamId, teamId));
    const tousEntretiens = await db.select().from(entretiens).where(eq(entretiens.teamId, teamId));
    const vivantesEntretien = new Set<string>();
    for (const e of tousEngins.filter((x) => x.actif)) {
      const siens = tousEntretiens.filter((t) => t.enginId === e.id);
      const a = alerteEntretien(e, siens);
      if (a.niveau !== "bientot" && a.niveau !== "depasse") continue;
      const cle = `entretien:${e.id}:${a.niveau}`;
      vivantesEntretien.add(cle);
      await creerNotifServeur(
        teamId, "entretien", cle,
        a.niveau === "depasse" ? `Entretien dépassé — ${e.nom}` : `Entretien bientôt — ${e.nom}`,
        a.niveau === "depasse"
          ? `${Math.abs(a.reste ?? 0)} h au-delà du seuil (${e.seuilEntretienH} h).`
          : `Encore ${a.reste} h avant l'entretien des ${e.seuilEntretienH} h.`,
        `/engins/${e.id}`
      );
    }
    await retirerNotifsParPrefixe(teamId, "entretien:", vivantesEntretien);

    // 2) Stock bas
    const tousMateriels = await db.select().from(materiel).where(eq(materiel.teamId, teamId));
    const vivantesStock = new Set<string>();
    for (const m of tousMateriels.filter(stockBas)) {
      const cle = `stock:${m.id}`;
      vivantesStock.add(cle);
      await creerNotifServeur(
        teamId, "stock", cle, `Stock bas — ${m.nom}`,
        `Il reste ${m.quantite} ${m.unite} (seuil ${m.seuilAlerte}).`, `/materiel`
      );
    }
    await retirerNotifsParPrefixe(teamId, "stock:", vivantesStock);

    // 3) Chantiers terminés — on garde la trace même après (pas de retrait)
    const termines = await db.select().from(chantiers)
      .where(and(eq(chantiers.teamId, teamId), eq(chantiers.statut, "termine")));
    for (const c of termines) {
      await creerNotifServeur(
        teamId, "chantier", `chantier:${c.id}:termine`, `Chantier terminé — ${c.nom}`,
        "Pense à saisir les volumes par catégorie et à facturer.", `/chantiers/${c.id}`
      );
    }
  } catch (err) {
    console.error("recalculerAlertes a échoué :", err);
  }
}
