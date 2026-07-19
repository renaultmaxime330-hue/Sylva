import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { teamMembers } from "@/lib/server/db/schema";
import { contexteEquipeChef, estErreur } from "@/lib/server/auth/contexte";
import { tracer } from "@/lib/server/audit";

const corps = z.object({ chefEntreprise: z.boolean() });

type Ctx = { params: Promise<{ userId: string }> };

/** Nommer/retirer le statut de chef d'entreprise d'un membre — réservé aux
    chefs existants (contexteEquipeChef). Une équipe peut se retrouver sans
    aucun chef (ex. l'unique chef se retire) : ce n'est pas un état invalide,
    ça ferme juste l'accès compta/factures jusqu'à ce qu'un membre soit
    renommé chef via l'accès base de données si besoin. */
export async function PATCH(req: Request, { params }: Ctx) {
  const ctx = await contexteEquipeChef(req);
  if (estErreur(ctx)) return ctx;
  const { userId } = await params;

  const parsed = corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  const [cible] = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, ctx.teamId))).limit(1);
  if (!cible) return NextResponse.json({ erreur: "Membre introuvable." }, { status: 404 });

  await db.update(teamMembers).set({ chefEntreprise: parsed.data.chefEntreprise })
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, ctx.teamId)));

  tracer({
    teamId: ctx.teamId, userId: ctx.u.id,
    action: parsed.data.chefEntreprise ? "equipe.chef_nomme" : "equipe.chef_retire",
    entityType: "team_members", entityId: userId, req,
  });

  return NextResponse.json({ ok: true });
}
