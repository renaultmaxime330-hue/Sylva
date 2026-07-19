import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { users, teamMembers } from "@/lib/server/db/schema";
import { utilisateurCourant } from "@/lib/server/auth/session";
import { limiteMutationDepassee } from "@/lib/server/auth/rateLimit";
import { tracer } from "@/lib/server/audit";

export async function GET(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  return NextResponse.json({ user: u });
}

const corps = z.object({ role: z.enum(["abatteur", "debardeur"]) });

/** Changer de rôle en cours de route (l'abatteur prend le porteur, ou
    inversement) — libre pour chacun, pas réservé au chef. Répercuté sur
    team_members.role pour rester cohérent avec la liste de l'équipe et les
    couleurs en direct sur la carte. */
export async function PATCH(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  if (limiteMutationDepassee(`mutation:${u.id}`)) {
    return NextResponse.json({ erreur: "Trop de requêtes — patiente un instant." }, { status: 429 });
  }

  const parsed = corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  if (parsed.data.role === u.role) return NextResponse.json({ ok: true, role: u.role });

  await db.update(users).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(users.id, u.id));
  await db.update(teamMembers).set({ role: parsed.data.role }).where(eq(teamMembers.userId, u.id));

  tracer({ userId: u.id, action: "auth.role_change", entityType: "users", entityId: u.id, meta: { role: parsed.data.role }, req });

  return NextResponse.json({ ok: true, role: parsed.data.role });
}
