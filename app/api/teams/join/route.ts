import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { teams, teamMembers } from "@/lib/server/db/schema";
import { utilisateurCourant } from "@/lib/server/auth/session";

const corps = z.object({ code: z.string().trim().toUpperCase().length(6, "Code invalide.") });

export async function POST(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

  const parsed = corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Code invalide." }, { status: 400 });

  const [dejaMembre] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers)
    .where(eq(teamMembers.userId, u.id)).limit(1);
  if (dejaMembre) return NextResponse.json({ erreur: "Tu es déjà dans une équipe — quitte-la d'abord." }, { status: 409 });

  const [t] = await db.select({ id: teams.id }).from(teams).where(eq(teams.code, parsed.data.code)).limit(1);
  if (!t) return NextResponse.json({ erreur: "Code d'équipe invalide." }, { status: 404 });

  try {
    await db.insert(teamMembers).values({ teamId: t.id, userId: u.id, role: u.role, chefEntreprise: false, nom: u.nom });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ erreur: "Tu es déjà dans une équipe — quitte-la d'abord." }, { status: 409 });
    }
    return NextResponse.json({ erreur: "Impossible de rejoindre l'équipe." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teamId: t.id });
}
