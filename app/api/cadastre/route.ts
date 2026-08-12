import { NextResponse } from "next/server";
import { contexteEquipe, estErreur } from "@/lib/server/auth/contexte";

/* Contour de la parcelle cadastrale sous un point.

   Même service que /api/geocode (API Carto de l'IGN, module cadastre) mais
   on récupère ici la géométrie, pas seulement le numéro : elle sert à créer
   le tracé de la parcelle sans avoir à le dessiner au doigt.

   Appel côté serveur, comme pour /api/geocode : la CSP reste en
   `connect-src 'self'`. */

const CADASTRE = "https://apicarto.ign.fr/api/cadastre/parcelle";
const DELAI_MS = 9000;

type Anneau = [number, number][];

/* Aire planaire signée (formule du lacet). Suffisante ici : on ne s'en sert
   que pour comparer les parties d'une même parcelle entre elles, pas pour
   afficher une surface — la vraie surface géodésique est calculée à
   l'enregistrement du tracé. */
function aireAnneau(anneau: Anneau): number {
  let a = 0;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
    a += (anneau[j][0] + anneau[i][0]) * (anneau[j][1] - anneau[i][1]);
  }
  return Math.abs(a / 2);
}

function sansZerosInitiaux(s: string): string {
  return s.replace(/^0+/, "") || s;
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
  let data: unknown;
  try {
    const r = await fetch(`${CADASTRE}?geom=${geom}`, {
      signal: AbortSignal.timeout(DELAI_MS),
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return NextResponse.json({ erreur: "Cadastre injoignable." }, { status: 502 });
    data = await r.json();
  } catch {
    return NextResponse.json({ erreur: "Cadastre injoignable." }, { status: 502 });
  }

  const f = (data as { features?: { geometry?: unknown; properties?: Record<string, unknown> }[] })
    ?.features?.[0];
  if (!f?.geometry) {
    return NextResponse.json({ erreur: "Aucune parcelle cadastrale à cet endroit." }, { status: 404 });
  }

  const g = f.geometry as { type: string; coordinates: unknown };
  // Le cadastre renvoie du MultiPolygon ; notre modèle de tracé ne gère que
  // le Polygon simple. Une parcelle en plusieurs morceaux est rare mais
  // existe (coupée par un chemin) : on garde alors la plus grande partie
  // plutôt que la première venue, qui pourrait être un résidu de quelques m².
  let anneaux: Anneau[];
  if (g.type === "MultiPolygon") {
    const parties = g.coordinates as Anneau[][];
    if (!parties?.length) return NextResponse.json({ erreur: "Parcelle illisible." }, { status: 502 });
    anneaux = parties.reduce((meilleure, p) =>
      aireAnneau(p[0]) > aireAnneau(meilleure[0]) ? p : meilleure);
  } else if (g.type === "Polygon") {
    anneaux = g.coordinates as Anneau[];
  } else {
    return NextResponse.json({ erreur: "Parcelle illisible." }, { status: 502 });
  }

  const props = f.properties ?? {};
  const section = typeof props.section === "string" ? sansZerosInitiaux(props.section) : "";
  const numero = typeof props.numero === "string" ? sansZerosInitiaux(props.numero) : "";

  return NextResponse.json({
    geojson: { type: "Polygon", coordinates: anneaux },
    parcelle: [section, numero].filter(Boolean).join(" ") || null,
    commune: typeof props.nom_com === "string" ? props.nom_com : null,
  });
}
