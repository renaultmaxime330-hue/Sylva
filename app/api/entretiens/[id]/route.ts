import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { entretiens } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { recalculerAlertes } from "@/lib/server/recalculerAlertes";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(entretiens).where(and(eq(entretiens.id, id), eq(entretiens.teamId, ctx.teamId)));
  emettreEquipe(ctx.teamId, "entretiens", id, "delete");
  void recalculerAlertes(ctx.teamId);
  return NextResponse.json({ ok: true });
}
