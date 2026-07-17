import type { NextResponse } from "next/server";
import { db } from "../db/client";
import { refreshTokens } from "../db/schema";
import { genererRafraichissement, signerAcces, type PayloadAcces } from "./tokens";
import type { Utilisateur } from "./session";

export const COOKIE_RAFRAICHISSEMENT = "sylva_rt";

/** Émet une nouvelle paire de jetons pour un utilisateur (inscription, connexion,
    ou rotation) et enregistre le hash du refresh token en base. */
export async function emettreJetons(u: Utilisateur): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const payload: PayloadAcces = { sub: u.id, role: u.role, nom: u.nom };
  const accessToken = signerAcces(payload);
  const { token: refreshToken, hash, expiresAt } = genererRafraichissement();
  await db.insert(refreshTokens).values({ userId: u.id, tokenHash: hash, expiresAt });
  return { accessToken, refreshToken, expiresAt };
}

export function optionsCookieRafraichissement(expiresAt: Date) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/** Nettoie une éventuelle ancienne variante du cookie posée avec Path=/api/auth
    (bug corrigé en cours de développement) : sans ça, deux cookies de même nom
    coexistent et le navigateur peut envoyer l'ancien — déjà révoqué — en premier
    sur les appels vers /api/auth/*, masquant le nouveau.
    ⚠️ Passe par un en-tête Set-Cookie BRUT, pas par res.cookies.set() : cette
    API interne indexe par NOM seul et écraserait silencieusement le cookie
    valide qu'on vient de poser dans la même réponse (vérifié empiriquement —
    un seul Set-Cookie survivait sur deux appels .set() avec des Path différents). */
export function nettoyerAncienneVarianteCookie(res: NextResponse): void {
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_RAFRAICHISSEMENT}=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
  );
}

