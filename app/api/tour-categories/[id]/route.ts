import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { tourCategories, journees } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { tourCategoriePatchSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { tracer } from "@/lib/server/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = tourCategoriePatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.update(tourCategories).set({ ...parsed.data, updatedAt: sql`now()` })
    .where(and(eq(tourCategories.id, id), eq(tourCategories.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Catégorie introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "tourCategories", row.id, "update");
  return NextResponse.json({ categorie: row });
}

/** Suppression bloquée si des journées existantes utilisent encore cette
    catégorie (des tours enregistrés perdraient leur nom/couleur) — l'équipe
    doit archiver (actif:false) plutôt que supprimer dans ce cas. */
export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const lignes = await db.select({ tours: journees.tours }).from(journees).where(eq(journees.teamId, ctx.teamId));
  const utilisee = lignes.some((l) => {
    const t = l.tours as Record<string, number> | null;
    return !!t && typeof t[id] === "number" && t[id] > 0;
  });
  if (utilisee) {
    return NextResponse.json(
      { erreur: "Catégorie utilisée dans des journées existantes — archive-la plutôt que de la supprimer." },
      { status: 409 }
    );
  }

  const [row] = await db.delete(tourCategories)
    .where(and(eq(tourCategories.id, id), eq(tourCategories.teamId, ctx.teamId))).returning({ id: tourCategories.id });
  if (!row) return NextResponse.json({ erreur: "Catégorie introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "tourCategories", id, "delete");
  tracer({ teamId: ctx.teamId, userId: ctx.u.id, action: "suppression", entityType: "tourCategorie", entityId: id, req });
  return NextResponse.json({ ok: true });
}
