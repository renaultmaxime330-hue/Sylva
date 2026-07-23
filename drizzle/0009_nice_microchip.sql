CREATE TABLE "chantier_dossiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"couleur" text DEFAULT '#2E6B41' NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "dossier_id" uuid;--> statement-breakpoint
ALTER TABLE "chantier_dossiers" ADD CONSTRAINT "chantier_dossiers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chantier_dossiers_team_idx" ON "chantier_dossiers" USING btree ("team_id");--> statement-breakpoint
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_dossier_id_chantier_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."chantier_dossiers"("id") ON DELETE set null ON UPDATE no action;