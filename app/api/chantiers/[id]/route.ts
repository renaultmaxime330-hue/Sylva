import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { chantiers } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { chantierPatchSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { recalculerAlertes } from "@/lib/server/recalculerAlertes";
import { tracer } from "@/lib/server/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  const [row] = await db.select().from(chantiers).where(and(eq(chantiers.id, id), eq(chantiers.teamId, ctx.teamId))).limit(1);
  if (!row) return NextResponse.json({ erreur: "Chantier introuvable." }, { status: 404 });
  return NextResponse.json({ chantier: row });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = chantierPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.update(chantiers).set({ ...parsed.data, updatedAt: sql`now()` })
    .where(and(eq(chantiers.id, id), eq(chantiers.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Chantier introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "chantiers", row.id, "update");
  if (parsed.data.statut !== undefined) void recalculerAlertes(ctx.teamId);
  return NextResponse.json({ chantier: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(chantiers).where(and(eq(chantiers.id, id), eq(chantiers.teamId, ctx.teamId)));
  emettreEquipe(ctx.teamId, "chantiers", id, "delete");
  tracer({ teamId: ctx.teamId, userId: ctx.u.id, action: "suppression", entityType: "chantiers", entityId: id, req });
  return NextResponse.json({ ok: true });
}
