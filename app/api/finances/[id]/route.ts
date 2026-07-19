import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { finances } from "@/lib/server/db/schema";
import { contexteEquipeChef, estErreur } from "@/lib/server/auth/contexte";
import { financePatchSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { tracer } from "@/lib/server/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  const [row] = await db.select().from(finances).where(and(eq(finances.id, id), eq(finances.teamId, ctx.teamId))).limit(1);
  if (!row) return NextResponse.json({ erreur: "Écriture introuvable." }, { status: 404 });
  return NextResponse.json({ finance: row });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = financePatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.update(finances).set({ ...parsed.data, updatedAt: sql`now()` })
    .where(and(eq(finances.id, id), eq(finances.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Écriture introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "finances", row.id, "update");
  return NextResponse.json({ finance: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(finances).where(and(eq(finances.id, id), eq(finances.teamId, ctx.teamId)));
  emettreEquipe(ctx.teamId, "finances", id, "delete");
  tracer({ teamId: ctx.teamId, userId: ctx.u.id, action: "suppression", entityType: "finances", entityId: id, req });
  return NextResponse.json({ ok: true });
}
