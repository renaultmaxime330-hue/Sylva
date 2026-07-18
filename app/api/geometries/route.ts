import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { geometries, chantiers } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { geometrieSchema } from "@/lib/server/validation";
import { surfaceHa, longueurM } from "@/lib/server/geo";
import { emettreEquipe } from "@/lib/server/realtime/emit";

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const url = new URL(req.url);
  const chantierId = url.searchParams.get("chantierId");
  if (!chantierId) return NextResponse.json({ erreur: "chantierId requis." }, { status: 400 });

  const lignes = await db.select().from(geometries)
    .where(and(eq(geometries.chantierId, chantierId), eq(geometries.teamId, ctx.teamId)));
  return NextResponse.json({ geometries: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = geometrieSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  // Le chantier doit appartenir à l'équipe — sinon on créerait un tracé orphelin/volé.
  const [ch] = await db.select({ id: chantiers.id }).from(chantiers)
    .where(and(eq(chantiers.id, parsed.data.chantierId), eq(chantiers.teamId, ctx.teamId))).limit(1);
  if (!ch) return NextResponse.json({ erreur: "Chantier introuvable." }, { status: 404 });

  const [row] = await db.insert(geometries).values({
    ...parsed.data, teamId: ctx.teamId, createdBy: ctx.u.id,
    surfaceHa: surfaceHa(parsed.data.geojson) ?? null,
    longueurM: longueurM(parsed.data.geojson) ?? null,
  }).returning();
  emettreEquipe(ctx.teamId, "geometries", row.id, "create");
  return NextResponse.json({ geometrie: row });
}
