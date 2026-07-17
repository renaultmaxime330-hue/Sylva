CREATE TYPE "public"."doc_statut" AS ENUM('brouillon', 'envoye', 'accepte', 'paye', 'refuse');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('devis', 'facture');--> statement-breakpoint
CREATE TYPE "public"."engin_type" AS ENUM('troncon', 'abatteuse', 'debardeur', 'tracteur', 'remorque', 'autre');--> statement-breakpoint
CREATE TYPE "public"."entretien_type" AS ENUM('entretien', 'revision', 'reparation');--> statement-breakpoint
CREATE TYPE "public"."finance_type" AS ENUM('recette', 'depense');--> statement-breakpoint
CREATE TYPE "public"."geom_type" AS ENUM('parcelle', 'point', 'piste', 'chemin', 'zone_danger', 'place_depot');--> statement-breakpoint
CREATE TYPE "public"."materiel_categorie" AS ENUM('chaine', 'guide', 'troncon', 'epi', 'gps', 'carburant', 'huile', 'piece', 'autre');--> statement-breakpoint
CREATE TYPE "public"."notif_type" AS ENUM('entretien', 'stock', 'chantier', 'carte');--> statement-breakpoint
CREATE TYPE "public"."statut_chantier" AS ENUM('a_faire', 'en_cours', 'termine');--> statement-breakpoint
CREATE TABLE "chantiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"client_id" uuid,
	"nom" text NOT NULL,
	"proprietaire" text DEFAULT '' NOT NULL,
	"client" text DEFAULT '' NOT NULL,
	"num_parcelle" text DEFAULT '' NOT NULL,
	"commune" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"surface_ha" double precision,
	"type_peuplement" text DEFAULT '' NOT NULL,
	"essence" text DEFAULT '' NOT NULL,
	"date_debut" date,
	"date_fin" date,
	"statut" "statut_chantier" DEFAULT 'a_faire' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"volumes" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"adresse" text,
	"commune" text,
	"telephone" text,
	"email" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"type" "engin_type" NOT NULL,
	"nom" text NOT NULL,
	"marque" text,
	"modele" text,
	"heures_total" double precision,
	"seuil_entretien_h" double precision,
	"actif" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entretiens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engin_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"type" "entretien_type" NOT NULL,
	"date" date NOT NULL,
	"heures_compteur" double precision,
	"cout" double precision,
	"carburant_l" double precision,
	"huile" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facture_sequences" (
	"team_id" uuid NOT NULL,
	"type" "doc_type" NOT NULL,
	"annee" integer NOT NULL,
	"next_n" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "facture_sequences_team_id_type_annee_pk" PRIMARY KEY("team_id","type","annee")
);
--> statement-breakpoint
CREATE TABLE "factures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"type" "doc_type" NOT NULL,
	"numero" text NOT NULL,
	"client_id" uuid,
	"client_nom" text DEFAULT '' NOT NULL,
	"client_adresse" text,
	"chantier_id" uuid,
	"date" date NOT NULL,
	"date_echeance" date,
	"lignes" jsonb NOT NULL,
	"tva" double precision DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"statut" "doc_statut" DEFAULT 'brouillon' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"chantier_id" uuid,
	"type" "finance_type" NOT NULL,
	"categorie" text NOT NULL,
	"libelle" text DEFAULT '' NOT NULL,
	"montant" double precision NOT NULL,
	"date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geometries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"type" "geom_type" NOT NULL,
	"nom" text NOT NULL,
	"couleur" text NOT NULL,
	"geojson" jsonb NOT NULL,
	"surface_ha" double precision,
	"longueur_m" double precision,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"date" date NOT NULL,
	"volume_m3" double precision,
	"nb_pins" integer,
	"nb_autres" integer,
	"heure_debut" text,
	"heure_fin" text,
	"pause_min" integer,
	"h_machine" double precision,
	"h_deplacement" double precision,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materiel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"categorie" "materiel_categorie" NOT NULL,
	"nom" text NOT NULL,
	"quantite" double precision DEFAULT 0 NOT NULL,
	"unite" text DEFAULT '' NOT NULL,
	"seuil_alerte" double precision,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"type" "notif_type" NOT NULL,
	"titre" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"href" text,
	"cle" text NOT NULL,
	"lu" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engins" ADD CONSTRAINT "engins_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_engin_id_engins_id_fk" FOREIGN KEY ("engin_id") REFERENCES "public"."engins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facture_sequences" ADD CONSTRAINT "facture_sequences_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factures" ADD CONSTRAINT "factures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finances" ADD CONSTRAINT "finances_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finances" ADD CONSTRAINT "finances_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finances" ADD CONSTRAINT "finances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journees" ADD CONSTRAINT "journees_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journees" ADD CONSTRAINT "journees_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journees" ADD CONSTRAINT "journees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materiel" ADD CONSTRAINT "materiel_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifs" ADD CONSTRAINT "notifs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chantiers_team_idx" ON "chantiers" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "clients_team_idx" ON "clients" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "engins_team_idx" ON "engins" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "entretiens_engin_idx" ON "entretiens" USING btree ("engin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "factures_numero_idx" ON "factures" USING btree ("team_id","type","numero");--> statement-breakpoint
CREATE INDEX "finances_team_idx" ON "finances" USING btree ("team_id","date");--> statement-breakpoint
CREATE INDEX "geometries_chantier_idx" ON "geometries" USING btree ("chantier_id");--> statement-breakpoint
CREATE INDEX "journees_team_idx" ON "journees" USING btree ("team_id","date");--> statement-breakpoint
CREATE INDEX "materiel_team_idx" ON "materiel" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifs_cle_idx" ON "notifs" USING btree ("team_id","cle");