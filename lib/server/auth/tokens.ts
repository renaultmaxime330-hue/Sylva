import { randomBytes, createHash } from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../env";

/* Jeton d'accès : JWT court (15 min), transporté en en-tête Authorization.
   Ne contient PAS l'équipe : l'appartenance peut changer (rejoindre/quitter),
   l'embarquer dans le JWT risquerait de rester périmée jusqu'à expiration —
   elle est donc revérifiée en base à chaque route qui en a besoin. */

const DUREE_ACCES = "15m";
const DUREE_RAFRAICHISSEMENT_JOURS = 30;

export interface PayloadAcces {
  sub: string;   // userId
  role: "abatteur" | "debardeur";
  nom: string;
}

export function signerAcces(p: PayloadAcces): string {
  return jwt.sign(p, env.JWT_ACCESS_SECRET, { expiresIn: DUREE_ACCES });
}

export function verifierAcces(token: string): PayloadAcces | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as PayloadAcces & jwt.JwtPayload;
  } catch {
    return null;
  }
}

/** Jeton de rafraîchissement opaque : généré aléatoirement, seul son hash est stocké en base. */
export function genererRafraichissement(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("base64url");
  const hash = hacherToken(token);
  const expiresAt = new Date(Date.now() + DUREE_RAFRAICHISSEMENT_JOURS * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

export function hacherToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
