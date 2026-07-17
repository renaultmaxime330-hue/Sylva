import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/server/auth/session";

export async function GET(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });
  return NextResponse.json({ user: u });
}
