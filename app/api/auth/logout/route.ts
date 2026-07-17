import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import { refreshTokens } from "@/lib/server/db/schema";
import { hacherToken } from "@/lib/server/auth/tokens";
import { COOKIE_RAFRAICHISSEMENT, nettoyerAncienneVarianteCookie } from "@/lib/server/auth/emettre";

export async function POST(req: Request) {
  const brut = req.headers.get("cookie")?.match(/(?:^|;\s*)sylva_rt=([^;]+)/)?.[1];
  if (brut) {
    const hash = hacherToken(decodeURIComponent(brut));
    await db.update(refreshTokens).set({ revokedAt: sql`now()` }).where(eq(refreshTokens.tokenHash, hash));
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete({ name: COOKIE_RAFRAICHISSEMENT, path: "/" });
  nettoyerAncienneVarianteCookie(res);
  return res;
}
