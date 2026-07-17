import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { verifierAcces } from "./tokens";

export interface Utilisateur {
  id: string;
  email: string;
  nom: string;
  role: "abatteur" | "debardeur";
}

/** Utilisateur courant à partir du header Authorization: Bearer <jwt>.
    Relit toujours la base (pas seulement le JWT) : un rôle changé ou un
    compte supprimé doit prendre effet immédiatement, pas seulement à
    l'expiration du jeton d'accès (15 min). */
export async function utilisateurCourant(req: Request): Promise<Utilisateur | null> {
  const entete = req.headers.get("authorization");
  if (!entete?.startsWith("Bearer ")) return null;
  const payload = verifierAcces(entete.slice(7));
  if (!payload) return null;

  const [u] = await db.select({ id: users.id, email: users.email, nom: users.nom, role: users.role })
    .from(users).where(eq(users.id, payload.sub)).limit(1);
  return u ?? null;
}
