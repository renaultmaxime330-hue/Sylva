import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { factures } from "@/lib/server/db/schema";
import { contexteEquipeChef, estErreur } from "@/lib/server/auth/contexte";
import { facturePatchSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { tracer } from "@/lib/server/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  const [row] = await db.select().from(factures).where(and(eq(factures.id, id), eq(factures.teamId, ctx.teamId))).limit(1);
  if (!row) return NextResponse.json({ erreur: "Document introuvable." }, { status: 404 });
  return NextResponse.json({ facture: row });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = facturePatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  try {
    const [row] = await db.update(factures).set({ ...parsed.data, updatedAt: sql`now()` })
      .where(and(eq(factures.id, id), eq(factures.teamId, ctx.teamId))).returning();
    if (!row) return NextResponse.json({ erreur: "Document introuvable." }, { status: 404 });
    emettreEquipe(ctx.teamId, "factures", row.id, "update");
    return NextResponse.json({ facture: row });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json({ erreur: "Ce numéro existe déjà pour ce type de document." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(factures).where(and(eq(factures.id, id), eq(factures.teamId, ctx.teamId)));
  emettreEquipe(ctx.teamId, "factures", id, "delete");
  tracer({ teamId: ctx.teamId, userId: ctx.u.id, action: "suppression", entityType: "factures", entityId: id, req });
  return NextResponse.json({ ok: true });
}
