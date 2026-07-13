import type { Chantier, Geometrie, GeoJSONGeometry } from "./db";

/* Export des géométries d'un chantier vers les formats SIG courants. */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slug(s: string): string {
  return (s || "chantier")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "chantier";
}

/* ---------- GeoJSON ---------- */
export function toGeoJSON(chantier: Chantier, geoms: Geometrie[]): string {
  const features = geoms.map((g) => ({
    type: "Feature" as const,
    properties: {
      nom: g.nom,
      type: g.type as string,
      couleur: g.couleur,
      surface_ha: g.surfaceHa ?? null,
      chantier: chantier.nom,
    },
    geometry: g.geojson,
  }));
  // Point GPS du chantier s'il existe
  if (chantier.lat != null && chantier.lng != null) {
    features.unshift({
      type: "Feature",
      properties: { nom: chantier.nom, type: "chantier", couleur: "#111", surface_ha: null, chantier: chantier.nom },
      geometry: { type: "Point", coordinates: [chantier.lng, chantier.lat] },
    });
  }
  return JSON.stringify({ type: "FeatureCollection", features }, null, 2);
}

/* ---------- GPX ---------- */
function ringToTrkseg(coords: [number, number][]): string {
  const pts = coords.map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"/>`).join("\n");
  return `    <trkseg>\n${pts}\n    </trkseg>`;
}

export function toGPX(chantier: Chantier, geoms: Geometrie[]): string {
  const wpts: string[] = [];
  const trks: string[] = [];

  if (chantier.lat != null && chantier.lng != null) {
    wpts.push(`  <wpt lat="${chantier.lat}" lon="${chantier.lng}"><name>${esc(chantier.nom)}</name></wpt>`);
  }

  for (const g of geoms) {
    const gj = g.geojson;
    if (gj.type === "Point") {
      wpts.push(`  <wpt lat="${gj.coordinates[1]}" lon="${gj.coordinates[0]}"><name>${esc(g.nom)}</name></wpt>`);
    } else if (gj.type === "LineString") {
      trks.push(`  <trk><name>${esc(g.nom)}</name>\n${ringToTrkseg(gj.coordinates)}\n  </trk>`);
    } else if (gj.type === "Polygon") {
      trks.push(`  <trk><name>${esc(g.nom)}</name>\n${ringToTrkseg(gj.coordinates[0])}\n  </trk>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sylva" xmlns="http://www.topografix.com/GPX/1/1">
${[...wpts, ...trks].join("\n")}
</gpx>`;
}

/* ---------- KML ---------- */
function coordsKML(coords: [number, number][]): string {
  return coords.map(([lon, lat]) => `${lon},${lat},0`).join(" ");
}

export function toKML(chantier: Chantier, geoms: Geometrie[]): string {
  const placemarks: string[] = [];

  if (chantier.lat != null && chantier.lng != null) {
    placemarks.push(`  <Placemark><name>${esc(chantier.nom)}</name><Point><coordinates>${chantier.lng},${chantier.lat},0</coordinates></Point></Placemark>`);
  }

  for (const g of geoms) {
    const gj = g.geojson;
    let geomXml = "";
    if (gj.type === "Point") {
      geomXml = `<Point><coordinates>${gj.coordinates[0]},${gj.coordinates[1]},0</coordinates></Point>`;
    } else if (gj.type === "LineString") {
      geomXml = `<LineString><coordinates>${coordsKML(gj.coordinates)}</coordinates></LineString>`;
    } else if (gj.type === "Polygon") {
      geomXml = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordsKML(gj.coordinates[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    }
    placemarks.push(`  <Placemark><name>${esc(g.nom)}</name><Style><LineStyle><color>ff206b2e</color><width>2</width></LineStyle><PolyStyle><color>552e6b41</color></PolyStyle></Style>${geomXml}</Placemark>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document><name>${esc(chantier.nom)}</name>
${placemarks.join("\n")}
</Document>
</kml>`;
}

/* ---------- Import GeoJSON (parcelles / points) ---------- */
export function parseGeoJSONGeometries(text: string): GeoJSONGeometry[] {
  const data = JSON.parse(text);
  const out: GeoJSONGeometry[] = [];
  const push = (geom: unknown) => {
    if (geom && typeof geom === "object" && "type" in geom) {
      const t = (geom as { type: string }).type;
      if (t === "Point" || t === "LineString" || t === "Polygon") out.push(geom as GeoJSONGeometry);
    }
  };
  if (data.type === "FeatureCollection") data.features?.forEach((f: { geometry: unknown }) => push(f.geometry));
  else if (data.type === "Feature") push(data.geometry);
  else push(data);
  return out;
}

/* ---------- Téléchargement ---------- */
export function downloadText(nom: string, contenu: string, mime: string): void {
  const blob = new Blob([contenu], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function nomFichier(chantier: Chantier, ext: string): string {
  return `${slug(chantier.nom)}.${ext}`;
}
