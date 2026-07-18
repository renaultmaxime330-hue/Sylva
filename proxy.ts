import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { refreshTokens } from "@/lib/server/db/schema";
import { hacherToken } from "@/lib/server/auth/tokens";

/* Compte obligatoire : toute page (hors /connexion et les routes API, qui
   font leur propre vérification) exige une session valide. Runtime Node.js
   par défaut dans cette version de Next → on peut interroger la vraie base
   ici, pas seulement lire un cookie à l'aveugle.

   Pose aussi les en-têtes de sécurité (CSP + le reste) sur toute page HTML,
   y compris /connexion — désormais incluse dans le matcher, avec juste la
   redirection d'auth court-circuitée pour elle. */

function construireCSP(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // style-src reste en 'unsafe-inline' délibérément : les styles inline
    // React (style={{...}}) et les badges Leaflet (divIcon avec attribut
    // style="...") sont utilisés partout dans l'appli — un nonce ne
    // s'applique pas aux attributs style, seulement aux balises <style>.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://data.geopf.fr https://tile.openstreetmap.org",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function avecEntetesSecurite(res: NextResponse, nonce: string): NextResponse {
  res.headers.set("Content-Security-Policy", construireCSP(nonce));
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // geolocation=(self) : la capture GPS des chantiers et le partage de
  // position en direct en ont besoin ; tout le reste est désactivé.
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)");
  return res;
}

export async function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  if (req.nextUrl.pathname === "/connexion") {
    return avecEntetesSecurite(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  const brut = req.cookies.get("sylva_rt")?.value;
  const valide = brut ? await sessionValide(brut) : false;

  if (!valide) {
    const url = new URL("/connexion", req.url);
    return avecEntetesSecurite(NextResponse.redirect(url), nonce);
  }
  return avecEntetesSecurite(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon.svg).*)"],
};
