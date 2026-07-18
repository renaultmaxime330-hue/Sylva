import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { hacherMotDePasse } from "@/lib/server/auth/password";
import {
  emettreJetons, optionsCookieRafraichissement, nettoyerAncienneVarianteCookie, COOKIE_RAFRAICHISSEMENT,
} from "@/lib/server/auth/emettre";
import { tracer } from "@/lib/server/audit";

const corps = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères."),
  nom: z.string().trim().min(1, "Nom requis"),
  role: z.enum(["abatteur", "debardeur"]),
});

export async function POST(req: Request) {
  const parsed = corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }
  const { email, password, nom, role } = parsed.data;

  const [existant] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existant) {
    return NextResponse.json({ erreur: "Cet e-mail a déjà un compte — connecte-toi." }, { status: 409 });
  }

  const passwordHash = await hacherMotDePasse(password);
  const [u] = await db.insert(users).values({ email, passwordHash, nom, role }).returning({
    id: users.id, email: users.email, nom: users.nom, role: users.role,
  });

  tracer({ userId: u.id, action: "auth.register", req });
  const { accessToken, refreshToken, expiresAt } = await emettreJetons(u);
  const res = NextResponse.json({ user: u, accessToken });
  res.cookies.set(COOKIE_RAFRAICHISSEMENT, refreshToken, optionsCookieRafraichissement(expiresAt));
  nettoyerAncienneVarianteCookie(res);
  return res;
}
