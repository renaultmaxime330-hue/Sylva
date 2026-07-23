import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { chantierDossiers } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { dossierSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const lignes = await db.select().from(chantierDossiers)
    .where(eq(chantierDossiers.teamId, ctx.teamId)).orderBy(asc(chantierDossiers.ordre));
  return NextResponse.json({ dossiers: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = dossierSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.insert(chantierDossiers).values({ ...parsed.data, teamId: ctx.teamId }).returning();
  emettreEquipe(ctx.teamId, "dossiers", row.id, "create");
  return NextResponse.json({ dossier: row });
}
