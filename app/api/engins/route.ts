import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { engins } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { enginSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";
import { recalculerAlertes } from "@/lib/server/recalculerAlertes";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const lignes = await db.select().from(engins).where(eq(engins.teamId, ctx.teamId)).orderBy(desc(engins.updatedAt));
  return NextResponse.json({ engins: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = enginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.insert(engins).values({ ...parsed.data, teamId: ctx.teamId }).returning();
  emettreEquipe(ctx.teamId, "engins", row.id, "create");
  void recalculerAlertes(ctx.teamId);
  return NextResponse.json({ engin: row });
}
