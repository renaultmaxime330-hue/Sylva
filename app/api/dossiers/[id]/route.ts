import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { chantierDossiers } from "@/lib/server/db/schema";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";
import { dossierPatchSchema } from "@/lib/server/validation";
import { emettreEquipe } from "@/lib/server/realtime/emit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;

  const parsed = dossierPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });

  const [row] = await db.update(chantierDossiers).set({ ...parsed.data, updatedAt: sql`now()` })
    .where(and(eq(chantierDossiers.id, id), eq(chantierDossiers.teamId, ctx.teamId))).returning();
  if (!row) return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "dossiers", row.id, "update");
  return NextResponse.json({ dossier: row });
}

/** Suppression libre : les chantiers du dossier ne sont pas supprimés, juste
    détachés (dossier_id → NULL, imposé par la contrainte ON DELETE SET NULL) —
    contrairement aux catégories de tours, perdre l'étiquette d'un chantier
    n'efface aucune donnée, pas besoin de bloquer/archiver. */
export async function DELETE(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  const { id } = await params;
  const [row] = await db.delete(chantierDossiers)
    .where(and(eq(chantierDossiers.id, id), eq(chantierDossiers.teamId, ctx.teamId))).returning({ id: chantierDossiers.id });
  if (!row) return NextResponse.json({ erreur: "Dossier introuvable." }, { status: 404 });
  emettreEquipe(ctx.teamId, "dossiers", id, "delete");
  // Les chantiers de ce dossier viennent d'être détachés en base (ON DELETE
  // SET NULL) — invalide leur cache aussi, sans quoi l'ancien dossierId reste
  // affiché côté client jusqu'au prochain refetch naturel.
  emettreEquipe(ctx.teamId, "chantiers", "*", "update");
  return NextResponse.json({ ok: true });
}
