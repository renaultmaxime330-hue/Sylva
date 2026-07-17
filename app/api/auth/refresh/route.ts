import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { refreshTokens, users } from "@/lib/server/db/schema";
import { hacherToken, genererRafraichissement, signerAcces } from "@/lib/server/auth/tokens";
import {
  COOKIE_RAFRAICHISSEMENT, optionsCookieRafraichissement, nettoyerAncienneVarianteCookie,
} from "@/lib/server/auth/emettre";
import { limiteAtteinte, enregistrerTentative } from "@/lib/server/auth/rateLimit";

/* Rotation à chaque usage, avec détection de réutilisation : si un jeton déjà
   révoqué (donc déjà consommé une première fois) est présenté à nouveau,
   c'est le signe qu'il a été volé — toute la chaîne de l'utilisateur est
   invalidée d'un coup, pas seulement ce jeton. */

function ip(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}

export async function POST(req: Request) {
  const cle = `refresh:ip:${ip(req)}`;
  if (limiteAtteinte(cle)) {
    return NextResponse.json({ erreur: "Trop de tentatives — réessaie dans quelques minutes." }, { status: 429 });
  }

  const brut = req.headers.get("cookie")?.match(/(?:^|;\s*)sylva_rt=([^;]+)/)?.[1];
  if (!brut) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  const hash = hacherToken(decodeURIComponent(brut));

  const [rt] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash)).limit(1);
  if (!rt) {
    enregistrerTentative(cle);
    return NextResponse.json({ erreur: "Session invalide." }, { status: 401 });
  }

  if (rt.revokedAt) {
    // Réutilisation d'un jeton déjà remplacé : signal de vol → on coupe toute la chaîne.
    await db.update(refreshTokens).set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.userId, rt.userId), isNull(refreshTokens.revokedAt)));
    enregistrerTentative(cle);
    const res = NextResponse.json({ erreur: "Session invalide — reconnecte-toi." }, { status: 401 });
    res.cookies.delete({ name: COOKIE_RAFRAICHISSEMENT, path: "/" });
    nettoyerAncienneVarianteCookie(res);
    return res;
  }

  if (rt.expiresAt < new Date()) {
    return NextResponse.json({ erreur: "Session expirée." }, { status: 401 });
  }

  const [u] = await db.select().from(users).where(eq(users.id, rt.userId)).limit(1);
  if (!u) return NextResponse.json({ erreur: "Compte introuvable." }, { status: 401 });

  const { token: nouveauToken, hash: nouveauHash, expiresAt } = genererRafraichissement();
  const [nouvelleLigne] = await db.insert(refreshTokens)
    .values({ userId: u.id, tokenHash: nouveauHash, expiresAt })
    .returning({ id: refreshTokens.id });
  await db.update(refreshTokens).set({ revokedAt: sql`now()`, replacedById: nouvelleLigne.id }).where(eq(refreshTokens.id, rt.id));

  const accessToken = signerAcces({ sub: u.id, role: u.role, nom: u.nom });
  const res = NextResponse.json({ accessToken });
  res.cookies.set(COOKIE_RAFRAICHISSEMENT, nouveauToken, optionsCookieRafraichissement(expiresAt));
  nettoyerAncienneVarianteCookie(res);
  return res;
}
