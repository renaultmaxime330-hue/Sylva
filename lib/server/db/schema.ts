import {
  pgTable, uuid, text, timestamp, date, boolean, jsonb, integer, doublePrecision,
  pgEnum, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";

/* Schéma Postgres (Drizzle). Un identifiant = un uuid généré par la base
   (gen_random_uuid()), plus généré côté client comme avant Dexie. */

export const roleEnum = pgEnum("role", ["abatteur", "debardeur"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nom: text("nom").notNull(),
  role: roleEnum("role").notNull().default("abatteur"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  replacedById: uuid("replaced_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("refresh_tokens_user_idx").on(t.userId)]);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nom: text("nom"),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  role: roleEnum("role").notNull().default("debardeur"),
  chefEntreprise: boolean("chef_entreprise").notNull().default(false),
  nom: text("nom"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.teamId, t.userId] })]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_log_team_idx").on(t.teamId, t.createdAt)]);

/* ---------- Données métier ---------- */
/* team_id partout : l'autorisation est du code applicatif ("l'utilisateur
   est-il membre de cette équipe ?"), pas de la RLS Postgres. */

export const statutChantierEnum = pgEnum("statut_chantier", ["a_faire", "en_cours", "termine"]);
export const geomTypeEnum = pgEnum("geom_type", ["parcelle", "point", "piste", "chemin", "zone_danger", "place_depot"]);
export const enginTypeEnum = pgEnum("engin_type", ["troncon", "abatteuse", "debardeur", "tracteur", "remorque", "autre"]);
export const entretienTypeEnum = pgEnum("entretien_type", ["entretien", "revision", "reparation"]);
export const materielCategorieEnum = pgEnum("materiel_categorie", [
  "chaine", "guide", "troncon", "epi", "gps", "carburant", "huile", "piece", "autre",
]);
export const financeTypeEnum = pgEnum("finance_type", ["recette", "depense"]);
export const docTypeEnum = pgEnum("doc_type", ["devis", "facture"]);
export const docStatutEnum = pgEnum("doc_statut", ["brouillon", "envoye", "accepte", "paye", "refuse"]);
export const notifTypeEnum = pgEnum("notif_type", ["entretien", "stock", "chantier", "carte"]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  adresse: text("adresse"),
  commune: text("commune"),
  telephone: text("telephone"),
  email: text("email"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("clients_team_idx").on(t.teamId)]);

export const chantiers = pgTable("chantiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  nom: text("nom").notNull(),
  proprietaire: text("proprietaire").notNull().default(""),
  client: text("client").notNull().default(""),
  numParcelle: text("num_parcelle").notNull().default(""),
  commune: text("commune").notNull().default(""),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  surfaceHa: doublePrecision("surface_ha"),
  typePeuplement: text("type_peuplement").notNull().default(""),
  essence: text("essence").notNull().default(""),
  dateDebut: date("date_debut", { mode: "string" }),
  dateFin: date("date_fin", { mode: "string" }),
  statut: statutChantierEnum("statut").notNull().default("a_faire"),
  notes: text("notes").notNull().default(""),
  volumes: jsonb("volumes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("chantiers_team_idx").on(t.teamId)]);

export const geometries = pgTable("geometries", {
  id: uuid("id").primaryKey().defaultRandom(),
  chantierId: uuid("chantier_id").notNull().references(() => chantiers.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  type: geomTypeEnum("type").notNull(),
  nom: text("nom").notNull(),
  couleur: text("couleur").notNull(),
  geojson: jsonb("geojson").notNull(),
  surfaceHa: doublePrecision("surface_ha"),
  longueurM: doublePrecision("longueur_m"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("geometries_chantier_idx").on(t.chantierId)]);

export const journees = pgTable("journees", {
  id: uuid("id").primaryKey().defaultRandom(),
  chantierId: uuid("chantier_id").notNull().references(() => chantiers.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  volumeM3: doublePrecision("volume_m3"),
  nbPins: integer("nb_pins"),
  nbAutres: integer("nb_autres"),
  heureDebut: text("heure_debut"),
  heureFin: text("heure_fin"),
  pauseMin: integer("pause_min"),
  hMachine: doublePrecision("h_machine"),
  hDeplacement: doublePrecision("h_deplacement"),
  notes: text("notes").notNull().default(""),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("journees_team_idx").on(t.teamId, t.date)]);

export const engins = pgTable("engins", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  type: enginTypeEnum("type").notNull(),
  nom: text("nom").notNull(),
  marque: text("marque"),
  modele: text("modele"),
  heuresTotal: doublePrecision("heures_total"),
  seuilEntretienH: doublePrecision("seuil_entretien_h"),
  actif: boolean("actif").notNull().default(true),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("engins_team_idx").on(t.teamId)]);

export const entretiens = pgTable("entretiens", {
  id: uuid("id").primaryKey().defaultRandom(),
  enginId: uuid("engin_id").notNull().references(() => engins.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  type: entretienTypeEnum("type").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  heuresCompteur: doublePrecision("heures_compteur"),
  cout: doublePrecision("cout"),
  carburantL: doublePrecision("carburant_l"),
  huile: boolean("huile").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("entretiens_engin_idx").on(t.enginId)]);

export const materiel = pgTable("materiel", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  categorie: materielCategorieEnum("categorie").notNull(),
  nom: text("nom").notNull(),
  quantite: doublePrecision("quantite").notNull().default(0),
  unite: text("unite").notNull().default(""),
  seuilAlerte: doublePrecision("seuil_alerte"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("materiel_team_idx").on(t.teamId)]);

export const finances = pgTable("finances", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  chantierId: uuid("chantier_id").references(() => chantiers.id, { onDelete: "set null" }),
  type: financeTypeEnum("type").notNull(),
  categorie: text("categorie").notNull(),
  libelle: text("libelle").notNull().default(""),
  montant: doublePrecision("montant").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("finances_team_idx").on(t.teamId, t.date)]);

export const factures = pgTable("factures", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  type: docTypeEnum("type").notNull(),
  numero: text("numero").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  clientNom: text("client_nom").notNull().default(""),
  clientAdresse: text("client_adresse"),
  chantierId: uuid("chantier_id").references(() => chantiers.id, { onDelete: "set null" }),
  date: date("date", { mode: "string" }).notNull(),
  dateEcheance: date("date_echeance", { mode: "string" }),
  lignes: jsonb("lignes").notNull(),
  tva: doublePrecision("tva").notNull().default(0),
  notes: text("notes").notNull().default(""),
  statut: docStatutEnum("statut").notNull().default("brouillon"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("factures_numero_idx").on(t.teamId, t.type, t.numero)]);

/** Compteur atomique par équipe/type/année — remplace le comptage côté client
    (source de course sous plusieurs écrivains) pour la numérotation D-2026-001. */
export const factureSequences = pgTable("facture_sequences", {
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  type: docTypeEnum("type").notNull(),
  annee: integer("annee").notNull(),
  nextN: integer("next_n").notNull().default(1),
}, (t) => [primaryKey({ columns: [t.teamId, t.type, t.annee] })]);

export const notifs = pgTable("notifs", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  type: notifTypeEnum("type").notNull(),
  titre: text("titre").notNull(),
  detail: text("detail").notNull().default(""),
  href: text("href"),
  cle: text("cle").notNull(),
  lu: boolean("lu").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("notifs_cle_idx").on(t.teamId, t.cle)]);
