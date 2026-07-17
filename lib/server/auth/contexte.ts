import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { teamMembers } from "../db/schema";
import { utilisateurCourant, type Utilisateur } from "./session";

export interface ContexteEquipe {
  u: Utilisateur;
  teamId: string;
}

/** Précondition commune à presque toutes les routes de données : authentifié
    ET membre d'une équipe (les données appartiennent à l'équipe, pas au compte). */
export async function contexteEquipe(req: Request): Promise<ContexteEquipe | NextResponse> {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

  const [mem] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers)
    .where(eq(teamMembers.userId, u.id)).limit(1);
  if (!mem) return NextResponse.json({ erreur: "Rejoins ou crée une équipe d'abord." }, { status: 400 });

  return { u, teamId: mem.teamId };
}

export function estErreur(c: ContexteEquipe | NextResponse): c is NextResponse {
  return c instanceof NextResponse;
}
