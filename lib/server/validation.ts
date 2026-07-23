import { z } from "zod";

/* Schémas zod partagés entre les routes de données métier.
   Bornes ajoutées en Phase 10 (durcissement) : les champs texte libre
   n'avaient auparavant aucune limite de taille — un client buggé ou
   malveillant pouvait envoyer des chaînes arbitrairement grandes. Les
   bornes ci-dessous sont généreuses (largement au-delà d'un usage réel)
   et ne visent qu'à écarter les cas dégénérés, pas à contraindre l'usage. */

const COURT = 200;   // noms, catégories, libellés, unités…
const LONG = 5000;   // notes, adresses, détails

/** Comme `.partial()`, mais sans le piège : sur un schéma dont des champs ont
    `.default(...)`, `.partial()` seul continue d'appliquer ce défaut à un champ
    omis (constaté en zod 4) au lieu de le laisser `undefined` — ce qui fait
    qu'un PATCH partiel (ex. { statut }) écrase silencieusement les autres
    champs avec leur valeur par défaut. On retire d'abord le `.default()`. */
function partiel(shape: z.ZodRawShape) {
  const sansDefauts: Record<string, z.ZodTypeAny> = {};
  for (const cle of Object.keys(shape)) {
    const champ = shape[cle] as z.ZodTypeAny;
    const sansDefaut: any = champ instanceof z.ZodDefault ? champ.removeDefault() : champ;
    sansDefauts[cle] = sansDefaut.optional();
  }
  return z.object(sansDefauts);
}

export const volumeCategorieSchema = z.object({
  id: z.string().max(COURT), categorie: z.string().max(COURT), m3: z.number().finite().min(0).max(1_000_000),
});

/** Champ date optionnel venant d'un <input type=date> : le formulaire envoie
    "" pour "non renseigné", mais le type `date` de Postgres n'accepte que
    NULL ou une vraie date — jamais la chaîne vide (contrairement à Dexie qui
    l'acceptait sans broncher). */
export const dateOptionnelle = z.string().max(40).nullable().optional()
  .transform((v) => (v === "" || v == null ? null : v));

export const dossierSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(COURT),
  couleur: z.string().trim().min(1).max(20).default("#2E6B41"),
  ordre: z.number().int().min(0).max(10_000).default(0),
});
export const dossierPatchSchema = partiel(dossierSchema.shape);

export const chantierSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(COURT),
  dossierId: z.string().uuid().nullable().optional(),
  proprietaire: z.string().max(COURT).default(""),
  client: z.string().max(COURT).default(""),
  numParcelle: z.string().max(COURT).default(""),
  commune: z.string().max(COURT).default(""),
  lat: z.number().finite().min(-90).max(90).nullable().optional(),
  lng: z.number().finite().min(-180).max(180).nullable().optional(),
  surfaceHa: z.number().finite().min(0).max(1_000_000).nullable().optional(),
  typePeuplement: z.string().max(COURT).default(""),
  essence: z.string().max(COURT).default(""),
  dateDebut: dateOptionnelle,
  dateFin: dateOptionnelle,
  statut: z.enum(["a_faire", "en_cours", "termine"]).default("a_faire"),
  notes: z.string().max(LONG).default(""),
  volumes: z.array(volumeCategorieSchema).max(200).nullable().optional(),
});

export const chantierPatchSchema = partiel(chantierSchema.shape);

export const clientSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(COURT),
  adresse: z.string().max(LONG).nullable().optional(),
  commune: z.string().max(COURT).nullable().optional(),
  telephone: z.string().max(COURT).nullable().optional(),
  email: z.string().max(COURT).nullable().optional(),
  notes: z.string().max(LONG).default(""),
});
export const clientPatchSchema = partiel(clientSchema.shape);

export const enginSchema = z.object({
  type: z.enum(["troncon", "abatteuse", "debardeur", "tracteur", "remorque", "autre"]),
  nom: z.string().trim().min(1, "Nom requis").max(COURT),
  marque: z.string().max(COURT).nullable().optional(),
  modele: z.string().max(COURT).nullable().optional(),
  heuresTotal: z.number().finite().min(0).max(1_000_000).nullable().optional(),
  seuilEntretienH: z.number().finite().min(0).max(100_000).nullable().optional(),
  actif: z.boolean().default(true),
  notes: z.string().max(LONG).default(""),
});
export const enginPatchSchema = partiel(enginSchema.shape);

export const entretienSchema = z.object({
  enginId: z.string().uuid(),
  type: z.enum(["entretien", "revision", "reparation"]),
  date: z.string().min(1, "Date requise").max(40),
  heuresCompteur: z.number().finite().min(0).max(1_000_000).nullable().optional(),
  cout: z.number().finite().min(0).max(10_000_000).nullable().optional(),
  carburantL: z.number().finite().min(0).max(100_000).nullable().optional(),
  huile: z.boolean().default(false),
  notes: z.string().max(LONG).default(""),
});

export const materielSchema = z.object({
  categorie: z.enum(["chaine", "guide", "troncon", "epi", "gps", "carburant", "huile", "piece", "autre"]),
  nom: z.string().trim().min(1, "Nom requis").max(COURT),
  quantite: z.number().finite().min(0).max(10_000_000).default(0),
  unite: z.string().max(COURT).default(""),
  seuilAlerte: z.number().finite().min(0).max(10_000_000).nullable().optional(),
  notes: z.string().max(LONG).default(""),
});
export const materielPatchSchema = partiel(materielSchema.shape);
export const ajusterQuantiteSchema = z.object({ delta: z.number().finite().min(-10_000_000).max(10_000_000) });

export const financeSchema = z.object({
  chantierId: z.string().uuid().nullable().optional(),
  type: z.enum(["recette", "depense"]),
  categorie: z.string().max(COURT).default(""),
  libelle: z.string().max(COURT).default(""),
  montant: z.number().finite().min(-10_000_000).max(10_000_000),
  date: z.string().min(1, "Date requise").max(40),
});
export const financePatchSchema = partiel(financeSchema.shape);

const coord = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const geojsonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Point"), coordinates: coord }),
  z.object({ type: z.literal("LineString"), coordinates: z.array(coord).min(2).max(20_000) }),
  z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(coord).max(20_000)).min(1).max(50) }),
]);

export const journeeSchema = z.object({
  chantierId: z.string().uuid(),
  date: z.string().min(1, "Date requise").max(40),
  volumeM3: z.number().finite().min(0).max(1_000_000).nullable().optional(),
  nbPins: z.number().int().min(0).max(1_000_000).nullable().optional(),
  nbAutres: z.number().int().min(0).max(1_000_000).nullable().optional(),
  heureDebut: z.string().max(20).nullable().optional(),
  heureFin: z.string().max(20).nullable().optional(),
  pauseMin: z.number().int().min(0).max(1440).nullable().optional(),
  hMachine: z.number().finite().min(0).max(1000).nullable().optional(),
  hDeplacement: z.number().finite().min(0).max(1000).nullable().optional(),
  hPanne: z.number().finite().min(0).max(1000).nullable().optional(),
  /** Tours de porteur par catégorie : { [tourCategorieId]: nombre de tours }. */
  tours: z.record(z.string().max(COURT), z.number().finite().min(0).max(10_000)).nullable().optional(),
  notes: z.string().max(LONG).default(""),
});
export const journeePatchSchema = partiel(journeeSchema.shape);

export const tourCategorieSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(COURT),
  couleur: z.string().trim().min(1).max(20).default("#2E6B41"),
  capaciteTourSteres: z.number().finite().min(0).max(1000).nullable().optional(),
  coefficientSterage: z.number().finite().min(0).max(3).default(0.7),
  ordre: z.number().int().min(0).max(10_000).default(0),
  actif: z.boolean().default(true),
});
export const tourCategoriePatchSchema = partiel(tourCategorieSchema.shape);

export const geometrieSchema = z.object({
  chantierId: z.string().uuid(),
  type: z.enum(["parcelle", "point", "piste", "chemin", "zone_danger", "place_depot"]),
  nom: z.string().max(COURT).default(""),
  couleur: z.string().max(20).default("#2E6B41"),
  geojson: geojsonSchema,
});

const ligneDocSchema = z.object({
  designation: z.string().max(COURT).default(""),
  quantite: z.number().finite().min(-1_000_000).max(1_000_000).default(0),
  unite: z.string().max(COURT).default(""),
  prixUnitaire: z.number().finite().min(-10_000_000).max(10_000_000).default(0),
});

export const factureSchema = z.object({
  type: z.enum(["devis", "facture"]),
  numero: z.string().trim().min(1, "Numéro requis").max(COURT),
  clientId: z.string().uuid().nullable().optional(),
  clientNom: z.string().max(COURT).default(""),
  clientAdresse: z.string().max(LONG).nullable().optional(),
  chantierId: z.string().uuid().nullable().optional(),
  date: z.string().min(1, "Date requise").max(40),
  dateEcheance: dateOptionnelle,
  lignes: z.array(ligneDocSchema).min(1).max(500),
  tva: z.number().finite().min(0).max(100).default(0),
  notes: z.string().max(LONG).default(""),
  statut: z.enum(["brouillon", "envoye", "accepte", "paye", "refuse"]).default("brouillon"),
});
export const facturePatchSchema = partiel(factureSchema.shape);

export const notifSchema = z.object({
  type: z.enum(["entretien", "stock", "chantier", "carte"]),
  titre: z.string().min(1).max(COURT),
  detail: z.string().max(LONG).default(""),
  href: z.string().max(500).nullable().optional(),
  cle: z.string().min(1).max(COURT),
});
