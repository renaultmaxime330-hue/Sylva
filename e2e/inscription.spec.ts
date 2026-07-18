import { test, expect } from "@playwright/test";
import { inscrire, nettoyerUtilisateur, utilisateurJetable } from "./helpers";

test("inscription puis accès au tableau de bord protégé", async ({ page }) => {
  const u = utilisateurJetable();
  try {
    await inscrire(page, u);

    // Un compte fraîchement créé n'a pas encore d'équipe — le tableau de
    // bord doit le dire clairement plutôt que de charger indéfiniment.
    await expect(page.getByRole("link", { name: "Chantiers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rejoins ou crée une équipe" })).toBeVisible();

    // Le rafraîchissement silencieux (refresh token) doit survivre à un F5.
    await page.reload();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Rejoins ou crée une équipe" })).toBeVisible();
  } finally {
    await nettoyerUtilisateur(u.email);
  }
});
