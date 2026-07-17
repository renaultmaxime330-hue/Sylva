import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { teams, teamMembers } from "@/lib/server/db/schema";
import { utilisateurCourant } from "@/lib/server/auth/session";

export async function GET(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

  const [mem] = await db.select().from(teamMembers).where(eq(teamMembers.userId, u.id)).limit(1);
  if (!mem) return NextResponse.json({ equipe: null });

  const [equipe] = await db.select().from(teams).where(eq(teams.id, mem.teamId)).limit(1);
  if (!equipe) return NextResponse.json({ equipe: null });

  const membres = await db.select().from(teamMembers).where(eq(teamMembers.teamId, mem.teamId));

  return NextResponse.json({
    equipe, membres, monRole: mem.role, monChefEntreprise: mem.chefEntreprise,
    suisProprietaire: equipe.ownerId === u.id,
  });
}

export async function DELETE(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  await db.delete(teamMembers).where(eq(teamMembers.userId, u.id));
  return NextResponse.json({ ok: true });
}
