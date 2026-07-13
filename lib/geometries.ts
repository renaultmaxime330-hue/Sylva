import area from "@turf/area";
import { db, newId, geomTypeInfo, type GeomType, type GeoJSONGeometry, type Geometrie } from "./db";

/* Surface d'un polygone (lng/lat) en hectares, calcul géodésique via Turf. */
export function surfaceHa(geojson: GeoJSONGeometry): number | undefined {
  if (geojson.type !== "Polygon") return undefined;
  const m2 = area({ type: "Feature", geometry: geojson, properties: {} });
  return Math.round((m2 / 10000) * 1000) / 1000; // 3 décimales
}

/* Distance géodésique entre deux points [lng,lat] (haversine, en mètres). */
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* Longueur d'une ligne (lng/lat) en mètres. */
export function longueurM(geojson: GeoJSONGeometry): number | undefined {
  if (geojson.type !== "LineString") return undefined;
  const c = geojson.coordinates;
  let m = 0;
  for (let i = 1; i < c.length; i++) m += haversine(c[i - 1], c[i]);
  return Math.round(m);
}

export async function ajouterGeometrie(
  chantierId: string,
  type: GeomType,
  geojson: GeoJSONGeometry,
  nom?: string,
  couleur?: string
): Promise<string> {
  const info = geomTypeInfo(type);
  const id = newId();
  const geo: Geometrie = {
    id,
    chantierId,
    type,
    nom: nom?.trim() || info.label,
    couleur: couleur || info.couleur,
    geojson,
    surfaceHa: surfaceHa(geojson),
    longueurM: longueurM(geojson),
    createdAt: new Date().toISOString(),
    syncStatus: "local",
  };
  await db.geometries.add(geo);
  return id;
}

export async function supprimerGeometrie(id: string): Promise<void> {
  await db.geometries.delete(id);
}

export async function renommerGeometrie(id: string, nom: string): Promise<void> {
  await db.geometries.update(id, { nom, syncStatus: "local" });
}
