import { NextResponse } from "next/server";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";

/* Position → commune + parcelle cadastrale.

   Appelé depuis le serveur et non depuis le navigateur, volontairement :
   la CSP de l'app est en `connect-src 'self'` et l'ouvrir à des domaines
   tiers pour ce seul besoin l'affaiblirait pour toute l'application.

   Deux services publics français, sans clé ni quota d'inscription :
   - Base Adresse Nationale : la référence pour les communes.
   - API Carto (IGN), module cadastre : la parcelle cadastrale sous un point,
     c'est-à-dire exactement le « numéro de parcelle » du formulaire.
   Les deux sont interrogés en parallèle et indépendamment : l'échec de l'un
   ne prive pas de l'autre. */

const BAN = "https://api-adresse.data.gouv.fr/reverse/";
const CADASTRE = "https://apicarto.ign.fr/api/cadastre/parcelle";
const DELAI_MS = 7000;

async function json(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(DELAI_MS),
      headers: { Accept: "application/json" },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/* Le cadastre stocke ses identifiants complétés par des zéros ("0U", "0474")
   alors qu'ils s'écrivent et se lisent sans ("U 474") — c'est la forme qu'on
   retrouve sur les actes et que l'utilisateur saisirait à la main. */
function sansZerosInitiaux(s: string): string {
  return s.replace(/^0+/, "") || s;
}

function formaterParcelle(props: Record<string, unknown>): string | null {
  const section = typeof props.section === "string" ? sansZerosInitiaux(props.section) : "";
  const numero = typeof props.numero === "string" ? sansZerosInitiaux(props.numero) : "";
  if (!section && !numero) return null;
  return [section, numero].filter(Boolean).join(" ");
}

export async function GET(req: Request) {
  const ctx = await contexteEquipe(req);
  if (estErreur(ctx)) return ctx;

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ erreur: "Coordonnées invalides." }, { status: 400 });
  }

  const geom = encodeURIComponent(JSON.stringify({ type: "Point", coordinates: [lng, lat] }));
  const [ban, cadastre] = await Promise.all([
    json(`${BAN}?lon=${lng}&lat=${lat}`),
    json(`${CADASTRE}?geom=${geom}`),
  ]);

  const banProps = (ban as { features?: { properties?: Record<string, unknown> }[] } | null)
    ?.features?.[0]?.properties;
  const cadProps = (cadastre as { features?: { properties?: Record<string, unknown> }[] } | null)
    ?.features?.[0]?.properties;

  // La commune vient de la BAN en priorité ; le cadastre la porte aussi
  // (nom_com), ce qui dépanne si la BAN ne répond pas.
  const commune =
    (typeof banProps?.city === "string" && banProps.city) ||
    (typeof cadProps?.nom_com === "string" && cadProps.nom_com) ||
    null;

  return NextResponse.json({
    commune,
    codePostal: typeof banProps?.postcode === "string" ? banProps.postcode : null,
    parcelle: cadProps ? formaterParcelle(cadProps) : null,
  });
}
