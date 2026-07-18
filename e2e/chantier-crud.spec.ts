import { test, expect } from "@playwright/test";
import { inscrire, nettoyerUtilisateur, utilisateurJetable } from "./helpers";

test("créer une équipe puis un chantier, et le retrouver dans la liste", async ({ page }) => {
  const u = utilisateurJetable();
  const nomChantier = `Coupe rase e2e ${crypto.randomUUID().slice(0, 6)}`;
  try {
    await inscrire(page, u);

    // Le CRUD chantier exige une équipe (contexteEquipe() renvoie 400 sans).
    await page.goto("/reglages");
    await page.getByRole("button", { name: "Créer mon équipe" }).click();
    await expect(page.getByText("Équipe créée")).toBeVisible();

    await page.goto("/chantiers/nouveau");
    await page.locator("#nom").fill(nomChantier);
    await page.getByRole("button", { name: "Créer le chantier" }).click();

    await page.waitForURL(/\/chantiers\/[^/]+$/);
    await expect(page.getByRole("heading", { name: nomChantier })).toBeVisible();

    await page.goto("/chantiers");
    await expect(page.getByRole("link", { name: new RegExp(nomChantier) })).toBeVisible();
  } finally {
    await nettoyerUtilisateur(u.email);
  }
});
