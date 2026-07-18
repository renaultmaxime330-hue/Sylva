import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { notifs } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { notifSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { creerNotifServeur } from "@/lib/server/notifs";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const lignes = await db.select().from(notifs).where(eq(notifs.teamId, ctx.teamId)).orderBy(desc(notifs.createdAt));
  return NextResponse.json({ notifs: lignes });
}

/** Dédoublonnage par `cle` (une même cause = une seule alerte) : conflit sur
    l'index unique (team_id, cle) ignoré silencieusement, comme l'ancien
    `creerNotif` qui vérifiait l'existence avant d'ajouter. */
export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = notifSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const notif = await creerNotifServeur(
    ctx.teamId, parsed.data.type, parsed.data.cle, parsed.data.titre, parsed.data.detail, parsed.data.href
  );
  return NextResponse.json({ notif });
}

/** Tout marquer comme lu. */
export async function PATCH(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  await db.update(notifs).set({ lu: true }).where(eq(notifs.teamId, ctx.teamId));
  emettreEquipe(ctx.teamId, "notifs", "*", "update");
  return NextResponse.json({ ok: true });
}

/** Tout effacer. */
export async function DELETE(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  await db.delete(notifs).where(eq(notifs.teamId, ctx.teamId));
  emettreEquipe(ctx.teamId, "notifs", "*", "delete");
  return NextResponse.json({ ok: true });
}
