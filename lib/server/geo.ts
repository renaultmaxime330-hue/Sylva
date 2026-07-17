import area from "@turf/area";

/* Copie volontaire de lib/geometries.ts (pure, sans dépendance à Dexie) :
   lib/db.ts instancie `new Dexie("sylva")` au chargement du module, ce qui
   suppose un `indexedDB` global — l'importer côté serveur planterait. */

interface GeoJSONGeom {
  type: "Point" | "LineString" | "Polygon";
  coordinates: unknown;
}

export function surfaceHa(geojson: GeoJSONGeom): number | undefined {
  if (geojson.type !== "Polygon") return undefined;
  const m2 = area({ type: "Feature", geometry: geojson as GeoJSON.Polygon, properties: {} });
  return Math.round((m2 / 10000) * 1000) / 1000;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function longueurM(geojson: GeoJSONGeom): number | undefined {
  if (geojson.type !== "LineString") return undefined;
  const c = geojson.coordinates as [number, number][];
  let m = 0;
  for (let i = 1; i < c.length; i++) m += haversine(c[i - 1], c[i]);
  return Math.round(m);
}
