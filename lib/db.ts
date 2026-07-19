/* ============================================================
   Sylva — types du domaine métier, partagés entre le client et
   ce qu'expose l'API serveur (Postgres/Railway). Ce fichier ne
   contient plus de base de données locale : les données vivent
   côté serveur, voir lib/server/db/schema.ts pour le schéma réel
   et lib/queries/*.ts pour les hooks qui les récupèrent.
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
}

/* Total des m³ produits sur un chantier. */
export function totalVolume(c: Pick<Chantier, "volumes">): number {
  return (c.volumes ?? []).reduce((s, v) => s + (Number(v.m3) || 0), 0);
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
  updatedAt?: string;
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
  nbToursPorteur?: number; // tours de porteur (débardage), demi-tours possibles
  notes: string;
  createdAt: string;
  updatedAt: string;
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
  seuilEntretienH?: number;  // intervalle d'entretien (heures)
  actif: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
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

/* ---------- Matériel (inventaire) ---------- */
export type MaterielCategorie =
  | "chaine" | "guide" | "troncon" | "epi" | "gps" | "carburant" | "huile" | "piece" | "autre";

export const MATERIEL_CATEGORIES: { value: MaterielCategorie; label: string }[] = [
  { value: "chaine", label: "Chaînes" },
  { value: "guide", label: "Guides" },
  { value: "troncon", label: "Tronçonneuses" },
  { value: "epi", label: "Casques / EPI" },
  { value: "gps", label: "GPS" },
  { value: "carburant", label: "Carburant" },
  { value: "huile", label: "Huiles" },
  { value: "piece", label: "Pièces" },
  { value: "autre", label: "Autre" },
];

export function materielCatLabel(c: MaterielCategorie): string {
  return MATERIEL_CATEGORIES.find((x) => x.value === c)?.label ?? "Autre";
}

export interface Materiel {
  id: string;
  categorie: MaterielCategorie;
  nom: string;
  quantite: number;
  unite: string;          // "u", "L", "m"…
  seuilAlerte?: number;   // stock bas si quantite <= seuil
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Comptabilité (recettes / dépenses) ---------- */
export interface Finance {
  id: string;
  chantierId?: string;    // rattaché à un chantier (ou frais général)
  type: "recette" | "depense";
  categorie: string;
  libelle: string;
  montant: number;        // en €
  date: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Clients / propriétaires ---------- */
export interface Client {
  id: string;
  nom: string;
  adresse?: string;
  commune?: string;
  telephone?: string;
  email?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Devis & Factures ---------- */
export interface LigneDoc {
  designation: string;
  quantite: number;
  unite: string;         // m³, h, forfait, u…
  prixUnitaire: number;  // € HT
}

export type DocType = "devis" | "facture";
export type DocStatut = "brouillon" | "envoye" | "accepte" | "paye" | "refuse";

export const DOC_STATUTS: { value: DocStatut; label: string; cls: string }[] = [
  { value: "brouillon", label: "Brouillon", cls: "todo" },
  { value: "envoye", label: "Envoyé", cls: "doing" },
  { value: "accepte", label: "Accepté", cls: "done" },
  { value: "paye", label: "Payé", cls: "done" },
  { value: "refuse", label: "Refusé", cls: "todo" },
];

export interface DocCommercial {
  id: string;
  type: DocType;
  numero: string;
  clientId?: string;
  clientNom: string;
  clientAdresse?: string;
  chantierId?: string;
  date: string;
  dateEcheance?: string;
  lignes: LigneDoc[];
  tva: number;           // taux en % (0 = TVA non applicable)
  notes: string;
  statut: DocStatut;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Alertes & notifications ---------- */
export type NotifType = "entretien" | "stock" | "chantier" | "carte";

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
