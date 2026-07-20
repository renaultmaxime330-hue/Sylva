import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { tourCategories } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { tourCategorieSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const lignes = await db.select().from(tourCategories)
    .where(eq(tourCategories.teamId, ctx.teamId)).orderBy(asc(tourCategories.ordre));
  return NextResponse.json({ categories: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = tourCategorieSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.insert(tourCategories).values({ ...parsed.data, teamId: ctx.teamId }).returning();
  emettreEquipe(ctx.teamId, "tourCategories", row.id, "create");
  return NextResponse.json({ categorie: row });
}
