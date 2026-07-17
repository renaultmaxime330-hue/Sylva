import { z } from "zod";

/* Variables d'environnement du backend. Chargées et validées une seule fois
   au démarrage — une variable manquante fait planter le serveur tout de
   suite plutôt que de produire une erreur confuse plus tard. */

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL manquant"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET trop court"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET trop court"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
});

function charger() {
  const r = schema.safeParse(process.env);
  if (!r.success) {
    const detail = r.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration serveur invalide :\n${detail}\n\nVoir .env.example.`);
  }
  return r.data;
}

export const env = charger();
