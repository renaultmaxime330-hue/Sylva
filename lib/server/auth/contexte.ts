import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { teamMembers } from "../db/schema";
import { utilisateurCourant, type Utilisateur } from "./session";
import { limiteMutationDepassee } from "./rateLimit";

export interface ContexteEquipe {
  u: Utilisateur;
  teamId: string;
}

/** Équipe de l'utilisateur (un seul par personne, imposé en base) — réutilisé
    par les routes HTTP (via contexteEquipe) et par l'auth du handshake Socket.io. */
export async function equipeDeUtilisateur(userId: string): Promise<string | null> {
  const [mem] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers)
    .where(eq(teamMembers.userId, userId)).limit(1);
  return mem?.teamId ?? null;
}

/** Précondition commune à presque toutes les routes de données : authentifié
    ET membre d'une équipe (les données appartiennent à l'équipe, pas au compte). */
export async function contexteEquipe(req: Request): Promise<ContexteEquipe | NextResponse> {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

  // Toutes les routes de données passent par ici : un seul endroit pour
  // freiner un bouclage anormal sur n'importe quelle mutation, plutôt que de
  // répéter la vérification dans chaque route. Les lectures (GET) ne comptent
  // pas — seules les écritures peuvent avoir un effet cumulatif indésirable.
  if (req.method !== "GET" && limiteMutationDepassee(`mutation:${u.id}`)) {
    return NextResponse.json({ erreur: "Trop de requêtes — patiente un instant." }, { status: 429 });
  }

  const teamId = await equipeDeUtilisateur(u.id);
  if (!teamId) return NextResponse.json({ erreur: "Rejoins ou crée une équipe d'abord." }, { status: 400 });

  return { u, teamId };
}

export function estErreur(c: ContexteEquipe | NextResponse): c is NextResponse {
  return c instanceof NextResponse;
}

async function estChefEquipe(userId: string, teamId: string): Promise<boolean> {
  const [mem] = await db.select({ chefEntreprise: teamMembers.chefEntreprise }).from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId))).limit(1);
  return mem?.chefEntreprise ?? false;
}

/** Comme contexteEquipe, mais réservé au chef d'entreprise de l'équipe —
    domaines sensibles (comptabilité, devis/factures) où le reste de
    l'équipe n'a rien à faire, ni en lecture ni en écriture. */
export async function contexteEquipeChef(req: Request): Promise<ContexteEquipe | NextResponse> {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;
  if (!(await estChefEquipe(ctx.u.id, ctx.teamId))) {
    return NextResponse.json({ erreur: "Réservé au chef d'entreprise." }, { status: 403 });
  }
  return ctx;
}
