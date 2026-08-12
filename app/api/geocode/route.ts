import { NextResponse } from "next/server";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";

/* Géocodage inverse (coordonnées → commune).

   Appelé depuis le serveur et non depuis le navigateur, volontairement :
   la CSP de l'app est en `connect-src 'self'` et l'ouvrir à un domaine
   tiers pour ce seul besoin l'affaiblirait pour toute l'application.

   Service : la Base Adresse Nationale (api-adresse.data.gouv.fr), service
   public français, sans clé ni quota d'inscription — c'est la référence
   pour les communes françaises, et Sylva ne travaille qu'en France. */

const BAN = "https://api-adresse.data.gouv.fr/reverse/";
const DELAI_MS = 6000;

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ erreur: "Coordonnées invalides." }, { status: 400 });
  }

  try {
    // Le géocodage est un confort : s'il échoue ou traîne, la position GPS
    // reste enregistrée — on ne veut jamais bloquer la saisie d'un chantier
    // pour ça, d'où le délai court et le 200 avec commune vide en cas d'échec.
    const r = await fetch(`${BAN}?lon=${lng}&lat=${lat}`, {
      signal: AbortSignal.timeout(DELAI_MS),
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return NextResponse.json({ commune: null });
    const data = await r.json();
    const props = data?.features?.[0]?.properties;
    return NextResponse.json({
      commune: typeof props?.city === "string" ? props.city : null,
      codePostal: typeof props?.postcode === "string" ? props.postcode : null,
    });
  } catch {
    return NextResponse.json({ commune: null });
  }
}
