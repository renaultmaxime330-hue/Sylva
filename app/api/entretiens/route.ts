import { NextResponse } from "next/server";
import { and, eq, isNull, or, lt, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { entretiens, engins } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { entretienSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { recalculerAlertes } from "@/lib/server/recalculerAlertes";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const url = new URL(req.url);
  const enginId = url.searchParams.get("enginId");
  const lignes = enginId
    ? await db.select().from(entretiens).where(and(eq(entretiens.enginId, enginId), eq(entretiens.teamId, ctx.teamId)))
    : await db.select().from(entretiens).where(eq(entretiens.teamId, ctx.teamId));
  return NextResponse.json({ entretiens: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = entretienSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  const data = parsed.data;

  const [ch] = await db.select({ id: engins.id }).from(engins)
    .where(and(eq(engins.id, data.enginId), eq(engins.teamId, ctx.teamId))).limit(1);
  if (!ch) return NextResponse.json({ erreur: "Engin introuvable." }, { status: 404 });

  const row = await db.transaction(async (tx) => {
    const [r] = await tx.insert(entretiens).values({ ...data, teamId: ctx.teamId, createdBy: ctx.u.id }).returning();
    // Met à jour le compteur de l'engin si cette intervention en fournit un plus haut —
    // en une seule requête conditionnelle, pas lecture-puis-écriture (course évitée).
    if (data.heuresCompteur != null) {
      await tx.update(engins).set({ heuresTotal: data.heuresCompteur, updatedAt: sql`now()` })
        .where(and(
          eq(engins.id, data.enginId), eq(engins.teamId, ctx.teamId),
          or(isNull(engins.heuresTotal), lt(engins.heuresTotal, data.heuresCompteur)),
        ));
    }
    return r;
  });
  emettreEquipe(ctx.teamId, "entretiens", row.id, "create");
  if (data.heuresCompteur != null) emettreEquipe(ctx.teamId, "engins", data.enginId, "update");
  void recalculerAlertes(ctx.teamId);
  return NextResponse.json({ entretien: row });
}
