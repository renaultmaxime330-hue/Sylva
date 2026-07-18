import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { engins } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { enginPatchSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { recalculerAlertes } from "@/lib/server/recalculerAlertes";
import { tracer } from "@/lib/server/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  const [row] = await db.select().from(engins).where(and(eq(engins.id, id), eq(engins.teamId, ctx.teamId))).limit(1);
  if (!row) return NextResponse.json({ erreur: "Engin introuvable." }, { status: 404 });
  return NextResponse.json({ engin: row });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = enginPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.update(engins).set({ ...parsed.data, updatedAt: sql`now()` })
    .where(and(eq(engins.id, id), eq(engins.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Engin introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "engins", row.id, "update");
  void recalculerAlertes(ctx.teamId);
  return NextResponse.json({ engin: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(engins).where(and(eq(engins.id, id), eq(engins.teamId, ctx.teamId)));
  emettreEquipe(ctx.teamId, "engins", id, "delete");
  void recalculerAlertes(ctx.teamId);
  tracer({ teamId: ctx.teamId, userId: ctx.u.id, action: "suppression", entityType: "engins", entityId: id, req });
  return NextResponse.json({ ok: true });
}
