CREATE TABLE "tour_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"couleur" text DEFAULT '#2E6B41' NOT NULL,
	"capacite_tour_steres" double precision,
	"coefficient_sterage" double precision DEFAULT 0.7 NOT NULL,
	"ordre" integer DEFAULT 0 NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journees" ADD COLUMN "tours" jsonb;--> statement-breakpoint
ALTER TABLE "tour_categories" ADD CONSTRAINT "tour_categories_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tour_categories_team_idx" ON "tour_categories" USING btree ("team_id");