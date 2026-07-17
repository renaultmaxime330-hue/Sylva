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
  /** Dernière modification — arbitre les conflits lors du partage d'équipe.
      Absent sur les tracés créés avant le partage → createdAt fait foi. */
  updatedAt?: string;
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
  syncStatus: "local" | "synced";
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
  syncStatus: "local" | "synced";
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
  syncStatus: "local" | "synced";
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
  syncStatus: "local" | "synced";
}

/* ---------- Alertes & notifications ---------- */

export type NotifType = "entretien" | "stock" | "chantier" | "carte";

export interface Notif {
  id: string;
  type: NotifType;
  titre: string;
  detail: string;
  href?: string;      // où aller au clic
  /** Clé stable : évite de recréer 10 fois la même alerte. */
  cle: string;
  lu: 0 | 1;          // indexable (Dexie n'indexe pas les booléens)
  createdAt: string;
}

/* ---------- Partage d'équipe ---------- */

export type KindPartage = "chantier" | "geometrie";

/** Trace d'une suppression, pour qu'elle se propage à l'équipe (sinon l'élément
    reviendrait au prochain « tirer »). Effacée une fois poussée. */
export interface Tombe {
  cle: string;   // `${kind}:${id}`
  kind: KindPartage;
  id: string;
  at: string;
}

class SylvaDB extends Dexie {
  chantiers!: Table<Chantier, string>;
  photos!: Table<Photo, string>;
  documents!: Table<DocFile, string>;
  geometries!: Table<Geometrie, string>;
  journees!: Table<Journee, string>;
  engins!: Table<Engin, string>;
  entretiens!: Table<Entretien, string>;
  materiel!: Table<Materiel, string>;
  finances!: Table<Finance, string>;
  clients!: Table<Client, string>;
  factures!: Table<DocCommercial, string>;
  notifs!: Table<Notif, string>;
  tombes!: Table<Tombe, string>;

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
    // v5 : matériel (inventaire) & comptabilité
    this.version(5).stores({
      materiel: "id, categorie, updatedAt",
      finances: "id, chantierId, type, date, updatedAt",
    });
    // v6 : clients / propriétaires
    this.version(6).stores({
      clients: "id, nom, updatedAt",
    });
    // v7 : devis & factures
    this.version(7).stores({
      factures: "id, type, numero, clientId, date, updatedAt",
    });
    // v8 : centre d'alertes (entretien, stock, fin de chantier, modifs carte de l'équipe)
    this.version(8).stores({
      notifs: "id, type, cle, lu, createdAt",
    });
    // v9 : suppressions en attente de propagation à l'équipe
    this.version(9).stores({
      tombes: "cle, kind, at",
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
