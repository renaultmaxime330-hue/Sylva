import Dexie, { type Table } from "dexie";

/* ============================================================
   Sylva — Base de données locale (IndexedDB)
   Tout est stocké sur l'appareil : l'app fonctionne à 100 %
   hors-ligne. La synchro cloud (Supabase) viendra en Phase 04
   en s'appuyant sur les champs updatedAt / syncStatus.
   ============================================================ */

export type Statut = "a_faire" | "en_cours" | "termine";

export const STATUTS: { value: Statut; label: string; cls: string }[] = [
  { value: "a_faire", label: "À faire", cls: "todo" },
  { value: "en_cours", label: "En cours", cls: "doing" },
  { value: "termine", label: "Terminé", cls: "done" },
];

/* Volume produit, ventilé par catégorie (bois d'œuvre, trituration…). */
export interface VolumeCategorie {
  id: string;
  categorie: string;
  m3: number;
}

/* Catégories proposées par défaut (l'utilisateur peut en saisir d'autres). */
export const CATEGORIES_BOIS = [
  "Bois d'œuvre",
  "Trituration",
  "Bois énergie",
  "Piquets",
  "Palette",
  "Chauffage",
];

export interface Chantier {
  id: string;
  nom: string;
  proprietaire: string;
  client: string;
  numParcelle: string;
  commune: string;
  lat?: number;
  lng?: number;
  surfaceHa?: number;
  typePeuplement: string;
  essence: string;
  dateDebut?: string; // ISO (YYYY-MM-DD)
  dateFin?: string;
  statut: Statut;
  notes: string;
  volumes?: VolumeCategorie[]; // m³ par catégorie (renseigné une fois terminé)
  createdAt: string;
  updatedAt: string;
  syncStatus: "local" | "synced"; // pour la future synchro cloud
}

/* Total des m³ produits sur un chantier. */
export function totalVolume(c: Pick<Chantier, "volumes">): number {
  return (c.volumes ?? []).reduce((s, v) => s + (Number(v.m3) || 0), 0);
}

export interface Photo {
  id: string;
  chantierId: string;
  blob: Blob;
  nom: string;
  legende: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface DocFile {
  id: string;
  chantierId: string;
  blob: Blob;
  nom: string;
  mime: string;
  taille: number;
  createdAt: string;
}

/* ---------- Géométries cartographiques ---------- */
export type GeoJSONGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [number, number][][] };

export type GeomType =
  | "parcelle"
  | "point"
  | "piste"
  | "chemin"
  | "zone_danger"
  | "place_depot";

export const GEOM_TYPES: {
  value: GeomType; label: string; couleur: string; geom: "Polygon" | "LineString" | "Point";
}[] = [
  { value: "parcelle", label: "Parcelle", couleur: "#2E6B41", geom: "Polygon" },
  { value: "zone_danger", label: "Zone dangereuse", couleur: "#C0392B", geom: "Polygon" },
  { value: "place_depot", label: "Place de dépôt", couleur: "#A75F24", geom: "Point" },
  { value: "point", label: "Point d'intérêt", couleur: "#2563EB", geom: "Point" },
  { value: "piste", label: "Piste", couleur: "#A75F24", geom: "LineString" },
  { value: "chemin", label: "Chemin", couleur: "#6B7280", geom: "LineString" },
];

export function geomTypeInfo(t: GeomType) {
  return GEOM_TYPES.find((x) => x.value === t) ?? GEOM_TYPES[0];
}

export interface Geometrie {
  id: string;
  chantierId: string;
  type: GeomType;
  nom: string;
  couleur: string;
  geojson: GeoJSONGeometry;
  surfaceHa?: number; // pour les polygones
  longueurM?: number; // pour les lignes (pistes, chemins) — en mètres
  createdAt: string;
  syncStatus: "local" | "synced";
}

/* ---------- Journée de travail (production + temps) ---------- */
export interface Journee {
  id: string;
  chantierId: string;
  date: string;         // YYYY-MM-DD
  // Production
  volumeM3?: number;
  nbPins?: number;
  nbAutres?: number;
  // Temps
  heureDebut?: string;  // HH:MM
  heureFin?: string;    // HH:MM
  pauseMin?: number;    // minutes de pause
  hMachine?: number;    // heures machine (tronçonneuse/abatteuse)
  hDeplacement?: number; // heures de déplacement
  notes: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: "local" | "synced";
}

/* ---------- Engins (machines) & entretiens ---------- */
export type EnginType = "troncon" | "abatteuse" | "debardeur" | "tracteur" | "remorque" | "autre";

export const ENGIN_TYPES: { value: EnginType; label: string }[] = [
  { value: "troncon", label: "Tronçonneuse" },
  { value: "abatteuse", label: "Abatteuse" },
  { value: "debardeur", label: "Débardeur" },
  { value: "tracteur", label: "Tracteur" },
  { value: "remorque", label: "Remorque" },
  { value: "autre", label: "Autre" },
];

export function enginTypeLabel(t: EnginType): string {
  return ENGIN_TYPES.find((x) => x.value === t)?.label ?? "Engin";
}

export interface Engin {
  id: string;
  type: EnginType;
  nom: string;
  marque?: string;
  modele?: string;
  heuresTotal?: number;      // compteur d'heures actuel
  coutHoraire?: number;      // € / h
  seuilEntretienH?: number;  // intervalle d'entretien (heures)
  actif: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: "local" | "synced";
}

export interface Entretien {
  id: string;
  enginId: string;
  type: "entretien" | "revision" | "reparation";
  date: string;              // YYYY-MM-DD
  heuresCompteur?: number;   // heures machine au moment de l'intervention
  cout?: number;
  carburantL?: number;
  huile: boolean;
  notes: string;
  createdAt: string;
}

class SylvaDB extends Dexie {
  chantiers!: Table<Chantier, string>;
  photos!: Table<Photo, string>;
  documents!: Table<DocFile, string>;
  geometries!: Table<Geometrie, string>;
  journees!: Table<Journee, string>;
  engins!: Table<Engin, string>;
  entretiens!: Table<Entretien, string>;

  constructor() {
    super("sylva");
    this.version(1).stores({
      chantiers: "id, statut, commune, proprietaire, updatedAt",
      photos: "id, chantierId, createdAt",
      documents: "id, chantierId, createdAt",
    });
    // v2 : ajout des géométries cartographiques (parcelles, points, pistes…)
    this.version(2).stores({
      geometries: "id, chantierId, type, createdAt",
    });
    // v3 : journées de travail (production + temps)
    this.version(3).stores({
      journees: "id, chantierId, date, updatedAt",
    });
    // v4 : engins (machines) & entretiens
    this.version(4).stores({
      engins: "id, type, actif, updatedAt",
      entretiens: "id, enginId, date, createdAt",
    });
  }
}

/* Instancié au niveau module : les composants qui l'utilisent sont
   des composants client, et Dexie n'ouvre la base qu'au premier accès
   (côté navigateur uniquement). */
export const db = new SylvaDB();

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
