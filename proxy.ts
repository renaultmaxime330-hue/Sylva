import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { refreshTokens } from "@/lib/server/db/schema";
import { hacherToken } from "@/lib/server/auth/tokens";

/* Compte obligatoire : toute page (hors /connexion et les routes API, qui
   font leur propre vérification) exige une session valide. Runtime Node.js
   par défaut dans cette version de Next → on peut interroger la vraie base
   ici, pas seulement lire un cookie à l'aveugle. */

export async function proxy(req: NextRequest) {
  const brut = req.cookies.get("sylva_rt")?.value;
  const valide = brut ? await sessionValide(brut) : false;

  if (!valide) {
    const url = new URL("/connexion", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

async function sessionValide(tokenBrut: string): Promise<boolean> {
  try {
    const hash = hacherToken(tokenBrut);
    const [rt] = await db.select({ expiresAt: refreshTokens.expiresAt })
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)))
      .limit(1);
    return !!rt && rt.expiresAt > new Date();
  } catch {
    // Base injoignable : ne pas bloquer l'utilisateur sur une panne réseau côté serveur.
    return true;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon.svg|connexion).*)"],
};
