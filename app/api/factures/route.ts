import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { factures, factureSequences } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { factureSchema } from "@/lib/server/validation";

const NUMERO_AUTO = /^[A-Za-z]+-(\d{4})-(\d+)$/;

/** Fait avancer le compteur d'après le numéro réellement utilisé (auto-suggéré
    ou saisi à la main) sans jamais reculer — auto-cicatrisant, pas de course
    possible puisque c'est un upsert atomique. */
async function avancerCompteur(teamId: string, type: "devis" | "facture", numero: string) {
  const m = NUMERO_AUTO.exec(numero);
  if (!m) return;
  const annee = Number(m[1]);
  const n = Number(m[2]);
  if (annee !== new Date().getFullYear()) return;
  await db.insert(factureSequences).values({ teamId, type, annee, nextN: n + 1 })
    .onConflictDoUpdate({
      target: [factureSequences.teamId, factureSequences.type, factureSequences.annee],
      set: { nextN: sql`greatest(${factureSequences.nextN}, ${n + 1})` },
    });
}

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const lignes = await db.select().from(factures).where(eq(factures.teamId, ctx.teamId)).orderBy(desc(factures.date));
  return NextResponse.json({ factures: lignes });
}

export async function POST(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const parsed = factureSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  try {
    const [row] = await db.insert(factures).values({ ...parsed.data, teamId: ctx.teamId, createdBy: ctx.u.id }).returning();
    await avancerCompteur(ctx.teamId, parsed.data.type, parsed.data.numero);
    return NextResponse.json({ facture: row });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json({ erreur: "Ce numéro existe déjà pour ce type de document." }, { status: 409 });
    }
    throw err;
  }
}
