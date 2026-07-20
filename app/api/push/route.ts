import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { pushSubscriptions } from "@/lib/server/db/schema";
import { utilisateurCourant } from "@/lib/server/auth/session";
import { limiteMutationDepassee } from "@/lib/server/auth/rateLimit";

const corps = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(400), auth: z.string().min(1).max(400) }),
});

/** Enregistre l'abonnement push de CET appareil (un par navigateur/appareil —
    PC, téléphone et tablette ont chacun le leur pour le même compte). */
export async function POST(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  if (limiteMutationDepassee(`mutation:${u.id}`)) {
    return NextResponse.json({ erreur: "Trop de requêtes — patiente un instant." }, { status: 429 });
  }

  const parsed = corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  await db.insert(pushSubscriptions)
    .values({ userId: u.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: u.id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
    });

  return NextResponse.json({ ok: true });
}

const corpsSuppr = z.object({ endpoint: z.string().url().max(2000) });

/** Retire l'abonnement de cet appareil (bouton "désactiver" ou permission retirée). */
export async function DELETE(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

  const parsed = corpsSuppr.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

  await db.delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, parsed.data.endpoint), eq(pushSubscriptions.userId, u.id)));

  return NextResponse.json({ ok: true });
}
