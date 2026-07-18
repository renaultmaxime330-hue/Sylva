import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { chantiers } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { chantierSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const lignes = await db.select().from(chantiers).where(eq(chantiers.teamId, ctx.teamId)).orderBy(desc(chantiers.updatedAt));
  return NextResponse.json({ chantiers: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = chantierSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.insert(chantiers).values({
    ...parsed.data, teamId: ctx.teamId, createdBy: ctx.u.id,
  }).returning();
  emettreEquipe(ctx.teamId, "chantiers", row.id, "create");
  return NextResponse.json({ chantier: row });
}
