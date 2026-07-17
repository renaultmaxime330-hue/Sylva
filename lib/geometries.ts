import area from "@turf/area";
import { geomTypeInfo, type GeomType, type GeoJSONGeometry } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

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

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(chantierId: string) {
  void queryClient.invalidateQueries({ queryKey: ["geometries", chantierId] });
}

export async function ajouterGeometrie(
  chantierId: string,
  type: GeomType,
  geojson: GeoJSONGeometry,
  nom?: string,
  couleur?: string
): Promise<string> {
  const info = geomTypeInfo(type);
  const r = await apiFetch("/api/geometries", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chantierId, type, geojson, nom: nom?.trim() || info.label, couleur: couleur || info.couleur }),
  });
  if (!r.ok) await lireErreur(r, "Impossible d'enregistrer le tracé.");
  const { geometrie } = await r.json();
  invalider(chantierId);
  return geometrie.id as string;
}

export async function supprimerGeometrie(id: string, chantierId: string): Promise<void> {
  const r = await apiFetch(`/api/geometries/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer le tracé.");
  invalider(chantierId);
}

export async function renommerGeometrie(id: string, nom: string, chantierId: string): Promise<void> {
  const r = await apiFetch(`/api/geometries/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom }),
  });
  if (!r.ok) await lireErreur(r, "Impossible de renommer le tracé.");
  invalider(chantierId);
}
