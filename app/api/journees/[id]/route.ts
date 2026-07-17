import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { journees } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { journeePatchSchema } from "@/lib/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  const [row] = await db.select().from(journees).where(and(eq(journees.id, id), eq(journees.teamId, ctx.teamId))).limit(1);
  if (!row) return NextResponse.json({ erreur: "Journée introuvable." }, { status: 404 });
  return NextResponse.json({ journee: row });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = journeePatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.update(journees).set({ ...parsed.data, updatedAt: sql`now()` })
    .where(and(eq(journees.id, id), eq(journees.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Journée introuvable." }, { status: 404 });
  return NextResponse.json({ journee: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(journees).where(and(eq(journees.id, id), eq(journees.teamId, ctx.teamId)));
  return NextResponse.json({ ok: true });
}
