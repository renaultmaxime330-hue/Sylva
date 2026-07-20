import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "./db/client";
import { notifs } from "./db/schema";
import { emettreEquipe } from "./realtime/emit";
import { envoyerPushEquipe } from "./webpush";

type NotifType = "entretien" | "stock" | "chantier" | "carte";

/** Dédoublonnage par `cle` (une même cause = une seule alerte), utilisé à la
    fois par la route POST /api/notifs (carte) et par le moteur d'alertes
    déduites (entretien/stock/chantier) — un seul point d'écriture. Le push
    est fire-and-forget : une notification en retard/échouée ne doit jamais
    faire échouer l'action qui l'a déclenchée. */
export async function creerNotifServeur(
  teamId: string, type: NotifType, cle: string, titre: string, detail: string, href?: string | null
) {
  const [row] = await db.insert(notifs).values({ teamId, type, cle, titre, detail, href: href ?? null })
    .onConflictDoNothing({ target: [notifs.teamId, notifs.cle] }).returning();
  if (row) {
    emettreEquipe(teamId, "notifs", row.id, "create");
    void envoyerPushEquipe(teamId, { title: titre, body: detail, url: href ?? "/alertes" })
      .catch((err) => console.error("envoyerPushEquipe a échoué :", err));
  }
  return row ?? null;
}

/** Retire les alertes dont la cause a disparu (préfixe de clé, hors celles à garder). */
export async function retirerNotifsParPrefixe(teamId: string, prefixe: string, garder: Set<string>): Promise<void> {
  const toutes = await db.select({ id: notifs.id, cle: notifs.cle }).from(notifs)
    .where(and(eq(notifs.teamId, teamId), like(notifs.cle, `${prefixe}%`)));
  const aSupprimer = toutes.filter((n) => !garder.has(n.cle)).map((n) => n.id);
  if (!aSupprimer.length) return;
  await db.delete(notifs).where(and(eq(notifs.teamId, teamId), inArray(notifs.id, aSupprimer)));
  emettreEquipe(teamId, "notifs", "*", "delete");
}
