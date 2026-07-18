import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { journees, chantiers } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { journeeSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const lignes = await db.select().from(journees).where(eq(journees.teamId, ctx.teamId)).orderBy(desc(journees.date));
  return NextResponse.json({ journees: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = journeeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [ch] = await db.select({ id: chantiers.id }).from(chantiers)
    .where(eq(chantiers.id, parsed.data.chantierId)).limit(1);
  if (!ch) return NextResponse.json({ erreur: "Chantier introuvable." }, { status: 404 });

  const [row] = await db.insert(journees).values({ ...parsed.data, teamId: ctx.teamId, createdBy: ctx.u.id }).returning();
  emettreEquipe(ctx.teamId, "journees", row.id, "create");
  return NextResponse.json({ journee: row });
}
