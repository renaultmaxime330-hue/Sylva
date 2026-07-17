import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { teams, teamMembers } from "@/lib/server/db/schema";
import { utilisateurCourant } from "@/lib/server/auth/session";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1, ambigus à recopier à la main

function genererCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

const corps = z.object({ nom: z.string().trim().max(80).optional() });

export async function POST(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

  const parsed = corps.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  const [dejaMembre] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers)
    .where(eq(teamMembers.userId, u.id)).limit(1);
  if (dejaMembre) return NextResponse.json({ erreur: "Tu es déjà dans une équipe — quitte-la d'abord." }, { status: 409 });

  // Équipe + adhésion du créateur en une seule transaction : sans ça, un échec
  // sur la 2e insertion (déjà membre ailleurs entre-temps) laisserait une
  // équipe fantôme sans aucun membre, comme dans l'ancien système Supabase.
  for (let essai = 0; essai < 5; essai++) {
    const code = genererCode();
    try {
      const equipe = await db.transaction(async (tx) => {
        const [t] = await tx.insert(teams).values({ ownerId: u.id, nom: parsed.data.nom || null, code }).returning();
        await tx.insert(teamMembers).values({
          teamId: t.id, userId: u.id, role: u.role, chefEntreprise: true, nom: u.nom,
        });
        return t;
      });
      return NextResponse.json({ equipe });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("teams_code_unique") && !msg.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ erreur: "Impossible de créer l'équipe." }, { status: 500 });
      }
      // collision de code — on retente avec un nouveau code
    }
  }
  return NextResponse.json({ erreur: "Impossible de créer l'équipe (réessaie)." }, { status: 500 });
}
