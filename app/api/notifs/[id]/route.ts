import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { notifs } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { emettreEquipe } from "@/lib/server/realtime/emit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  const [row] = await db.update(notifs).set({ lu: true })
    .where(and(eq(notifs.id, id), eq(notifs.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Alerte introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "notifs", row.id, "update");
  return NextResponse.json({ notif: row });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  await db.delete(notifs).where(and(eq(notifs.id, id), eq(notifs.teamId, ctx.teamId)));
  emettreEquipe(ctx.teamId, "notifs", id, "delete");
  return NextResponse.json({ ok: true });
}
