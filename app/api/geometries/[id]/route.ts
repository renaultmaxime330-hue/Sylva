import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { geometries } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { emettreEquipe } from "@/lib/server/realtime/emit";

type Ctx = { params: Promise<{ id: string }> };

const renommerSchema = z.object({ nom: z.string() });

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = renommerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  const [row] = await db.update(geometries).set({ nom: parsed.data.nom, updatedAt: sql`now()` })
    .where(and(eq(geometries.id, id), eq(geometries.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Tracé introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "geometries", row.id, "update");
  return NextResponse.json({ geometrie: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(geometries).where(and(eq(geometries.id, id), eq(geometries.teamId, ctx.teamId)));
  emettreEquipe(ctx.teamId, "geometries", id, "delete");
  return NextResponse.json({ ok: true });
}
