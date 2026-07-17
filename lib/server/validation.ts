import { z } from "zod";

/* Schémas zod partagés entre les routes de données métier. */

/** Comme `.partial()`, mais sans le piège : sur un schéma dont des champs ont
    `.default(...)`, `.partial()` seul continue d'appliquer ce défaut à un champ
    omis (constaté en zod 4) au lieu de le laisser `undefined` — ce qui fait
    qu'un PATCH partiel (ex. { statut }) écrase silencieusement les autres
    champs avec leur valeur par défaut. On retire d'abord le `.default()`. */
function partiel(shape: z.ZodRawShape) {
  const sansDefauts: Record<string, z.ZodTypeAny> = {};
  for (const cle of Object.keys(shape)) {
    const champ = shape[cle] as z.ZodTypeAny;
    sansDefauts[cle] = (champ instanceof z.ZodDefault ? champ.removeDefault() : champ).optional();
  }
  return z.object(sansDefauts);
}

export const volumeCategorieSchema = z.object({
  id: z.string(), categorie: z.string(), m3: z.number(),
});

/** Champ date optionnel venant d'un <input type=date> : le formulaire envoie
    "" pour "non renseigné", mais le type `date` de Postgres n'accepte que
    NULL ou une vraie date — jamais la chaîne vide (contrairement à Dexie qui
    l'acceptait sans broncher). */
export const dateOptionnelle = z.string().nullable().optional()
  .transform((v) => (v === "" || v == null ? null : v));

export const chantierSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis"),
  proprietaire: z.string().default(""),
  client: z.string().default(""),
  numParcelle: z.string().default(""),
  commune: z.string().default(""),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  surfaceHa: z.number().nullable().optional(),
  typePeuplement: z.string().default(""),
  essence: z.string().default(""),
  dateDebut: dateOptionnelle,
  dateFin: dateOptionnelle,
  statut: z.enum(["a_faire", "en_cours", "termine"]).default("a_faire"),
  notes: z.string().default(""),
  volumes: z.array(volumeCategorieSchema).nullable().optional(),
});

export const chantierPatchSchema = partiel(chantierSchema.shape);

export const clientSchema = z.object({
  nom: z.string().trim().min(1, "Nom requis"),
  adresse: z.string().nullable().optional(),
  commune: z.string().nullable().optional(),
  telephone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  notes: z.string().default(""),
});
export const clientPatchSchema = partiel(clientSchema.shape);

export const enginSchema = z.object({
  type: z.enum(["troncon", "abatteuse", "debardeur", "tracteur", "remorque", "autre"]),
  nom: z.string().trim().min(1, "Nom requis"),
  marque: z.string().nullable().optional(),
  modele: z.string().nullable().optional(),
  heuresTotal: z.number().nullable().optional(),
  seuilEntretienH: z.number().nullable().optional(),
  actif: z.boolean().default(true),
  notes: z.string().default(""),
});
export const enginPatchSchema = partiel(enginSchema.shape);

export const entretienSchema = z.object({
  enginId: z.string().uuid(),
  type: z.enum(["entretien", "revision", "reparation"]),
  date: z.string().min(1, "Date requise"),
  heuresCompteur: z.number().nullable().optional(),
  cout: z.number().nullable().optional(),
  carburantL: z.number().nullable().optional(),
  huile: z.boolean().default(false),
  notes: z.string().default(""),
});

export const materielSchema = z.object({
  categorie: z.enum(["chaine", "guide", "troncon", "epi", "gps", "carburant", "huile", "piece", "autre"]),
  nom: z.string().trim().min(1, "Nom requis"),
  quantite: z.number().default(0),
  unite: z.string().default(""),
  seuilAlerte: z.number().nullable().optional(),
  notes: z.string().default(""),
});
export const materielPatchSchema = partiel(materielSchema.shape);
export const ajusterQuantiteSchema = z.object({ delta: z.number() });

export const financeSchema = z.object({
  chantierId: z.string().uuid().nullable().optional(),
  type: z.enum(["recette", "depense"]),
  categorie: z.string().default(""),
  libelle: z.string().default(""),
  montant: z.number(),
  date: z.string().min(1, "Date requise"),
});
export const financePatchSchema = partiel(financeSchema.shape);

const geojsonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number(), z.number()]) }),
  z.object({ type: z.literal("LineString"), coordinates: z.array(z.tuple([z.number(), z.number()])).min(2) }),
  z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1) }),
]);

export const journeeSchema = z.object({
  chantierId: z.string().uuid(),
  date: z.string().min(1, "Date requise"),
  volumeM3: z.number().nullable().optional(),
  nbPins: z.number().int().nullable().optional(),
  nbAutres: z.number().int().nullable().optional(),
  heureDebut: z.string().nullable().optional(),
  heureFin: z.string().nullable().optional(),
  pauseMin: z.number().int().nullable().optional(),
  hMachine: z.number().nullable().optional(),
  hDeplacement: z.number().nullable().optional(),
  notes: z.string().default(""),
});
export const journeePatchSchema = partiel(journeeSchema.shape);

export const geometrieSchema = z.object({
  chantierId: z.string().uuid(),
  type: z.enum(["parcelle", "point", "piste", "chemin", "zone_danger", "place_depot"]),
  nom: z.string().default(""),
  couleur: z.string().default("#2E6B41"),
  geojson: geojsonSchema,
});

const ligneDocSchema = z.object({
  designation: z.string().default(""),
  quantite: z.number().default(0),
  unite: z.string().default(""),
  prixUnitaire: z.number().default(0),
});

export const factureSchema = z.object({
  type: z.enum(["devis", "facture"]),
  numero: z.string().trim().min(1, "Numéro requis"),
  clientId: z.string().uuid().nullable().optional(),
  clientNom: z.string().default(""),
  clientAdresse: z.string().nullable().optional(),
  chantierId: z.string().uuid().nullable().optional(),
  date: z.string().min(1, "Date requise"),
  dateEcheance: dateOptionnelle,
  lignes: z.array(ligneDocSchema).min(1),
  tva: z.number().default(0),
  notes: z.string().default(""),
  statut: z.enum(["brouillon", "envoye", "accepte", "paye", "refuse"]).default("brouillon"),
});
export const facturePatchSchema = partiel(factureSchema.shape);
