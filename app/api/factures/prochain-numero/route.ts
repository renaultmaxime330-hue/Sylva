import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { factureSequences } from "@/lib/server/db/schema";
import { contexteEquipeChef, estErreur } from "@/lib/server/auth/contexte";

/** Aperçu seul (aucune écriture) : le compteur n'avance réellement qu'à la
    création du document, pour ne jamais sauter de numéro sur un brouillon
    abandonné. */
export async function GET(req: Request) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "facture" ? "facture" : "devis";
  const annee = new Date().getFullYear();

  const [row] = await db.select().from(factureSequences)
    .where(and(eq(factureSequences.teamId, ctx.teamId), eq(factureSequences.type, type), eq(factureSequences.annee, annee)))
    .limit(1);
  const n = row?.nextN ?? 1;
  const prefixe = type === "devis" ? "D" : "F";
  return NextResponse.json({ numero: `${prefixe}-${annee}-${String(n).padStart(3, "0")}` });
}
