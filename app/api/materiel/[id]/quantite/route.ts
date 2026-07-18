import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { materiel } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { ajusterQuantiteSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { recalculerAlertes } from "@/lib/server/recalculerAlertes";

type Ctx = { params: Promise<{ id: string }> };

/** Ajustement atomique (+1/-1…) directement en SQL — pas de lecture-puis-écriture,
    donc pas de course possible entre deux clics rapides ou deux coéquipiers. */
export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = ajusterQuantiteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  const [row] = await db.update(materiel)
    .set({
      quantite: sql`greatest(0, round((${materiel.quantite} + ${parsed.data.delta})::numeric, 2))`,
      updatedAt: sql`now()`,
    })
    .where(and(eq(materiel.id, id), eq(materiel.teamId, ctx.teamId)))
    .returning();
  if (!row) return NextResponse.json({ erreur: "Article introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "materiel", row.id, "update");
  void recalculerAlertes(ctx.teamId);
  return NextResponse.json({ materiel: row });
}
