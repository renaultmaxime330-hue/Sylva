import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { verifierMotDePasse, hacherMotDePasse } from "@/lib/server/auth/password";
import {
  emettreJetons, optionsCookieRafraichissement, nettoyerAncienneVarianteCookie, COOKIE_RAFRAICHISSEMENT,
} from "@/lib/server/auth/emettre";
import { limiteAtteinte, enregistrerTentative, reinitialiserTentatives } from "@/lib/server/auth/rateLimit";

const corps = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const SEUIL_VERROUILLAGE = 5;
const DUREE_VERROUILLAGE_MS = 15 * 60 * 1000;
const ERREUR_GENERIQUE = "E-mail ou mot de passe incorrect.";

// Hash factice comparé quand l'e-mail n'existe pas — évite qu'un temps de
// réponse plus court ne révèle qu'un compte n'existe pas (attaque temporelle).
const HASH_FACTICE = await hacherMotDePasse("mot-de-passe-factice-pour-le-timing");

function ip(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}

export async function POST(req: Request) {
  const parsed = corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  const { email, password } = parsed.data;

  // La limite par IP protège contre le bourrage d'identifiants sur beaucoup de comptes
  // (seuil large, en mémoire). Le verrouillage d'UN compte précis est géré en base
  // (failedLoginCount/lockedUntil) : persiste au redémarrage, donne un délai exact.
  const cleIp = `login:ip:${ip(req)}`;
  if (limiteAtteinte(cleIp)) {
    return NextResponse.json({ erreur: "Trop de tentatives — réessaie dans quelques minutes." }, { status: 429 });
  }

  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!u) {
    await verifierMotDePasse(password, HASH_FACTICE); // temps constant
    enregistrerTentative(cleIp);
    return NextResponse.json({ erreur: ERREUR_GENERIQUE }, { status: 401 });
  }

  if (u.lockedUntil && u.lockedUntil > new Date()) {
    const min = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json({ erreur: `Compte verrouillé — réessaie dans ${min} min.` }, { status: 423 });
  }

  const ok = await verifierMotDePasse(password, u.passwordHash);
  if (!ok) {
    enregistrerTentative(cleIp);
    const compte = u.failedLoginCount + 1;
    await db.update(users).set({
      failedLoginCount: compte,
      lockedUntil: compte >= SEUIL_VERROUILLAGE ? new Date(Date.now() + DUREE_VERROUILLAGE_MS) : null,
    }).where(eq(users.id, u.id));
    return NextResponse.json({ erreur: ERREUR_GENERIQUE }, { status: 401 });
  }

  reinitialiserTentatives(cleIp);
  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: sql`now()` }).where(eq(users.id, u.id));

  const utilisateur = { id: u.id, email: u.email, nom: u.nom, role: u.role };
  const { accessToken, refreshToken, expiresAt } = await emettreJetons(utilisateur);
  const res = NextResponse.json({ user: utilisateur, accessToken });
  res.cookies.set(COOKIE_RAFRAICHISSEMENT, refreshToken, optionsCookieRafraichissement(expiresAt));
  nettoyerAncienneVarianteCookie(res);
  return res;
}
