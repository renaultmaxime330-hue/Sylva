import path from "path";
import type { Page } from "@playwright/test";

/* Un compte jetable par test — évite toute collision entre tests parallèles
   (fullyParallel: true) et rend le nettoyage trivial (un seul e-mail à
   retrouver en base). */
export function utilisateurJetable() {
  const suffixe = crypto.randomUUID().slice(0, 8);
  return {
    email: `e2e-${suffixe}@example.invalid`,
    password: "motdepasse123",
    nom: `Test E2E ${suffixe}`,
  };
}

export async function inscrire(page: Page, u: { email: string; password: string; nom: string }) {
  await page.goto("/connexion");
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await page.locator("#cx-email").fill(u.email);
  await page.locator("#cx-pass").fill(u.password);
  await page.locator("#cx-nom").fill(u.nom);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("/");
}

/* Nettoyage direct en base — même approche que les tests d'intégration
   Vitest (lib/server/concurrence.integration.test.ts) : pas de base de test
   séparée à cette échelle, on efface juste ce que le test a créé. */
export async function nettoyerUtilisateur(email: string) {
  try {
    process.loadEnvFile(path.resolve(__dirname, "../.env.local"));
  } catch {
    /* déjà chargé par un test précédent dans le même worker */
  }
  const { db } = await import("../lib/server/db/client");
  const { users, teams } = await import("../lib/server/db/schema");
  const { eq } = await import("drizzle-orm");

  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!u) return;
  await db.delete(teams).where(eq(teams.ownerId, u.id)); // cascade : chantiers, matériel, etc.
  await db.delete(users).where(eq(users.id, u.id)); // cascade : team_members, refresh_tokens
}
