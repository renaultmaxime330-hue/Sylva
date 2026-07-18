import { test, expect } from "@playwright/test";

test.describe("protection des routes", () => {
  test("visiter une page sans session redirige vers /connexion", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/connexion");
    await expect(page.locator("#cx-email")).toBeVisible();
  });

  test("aucune coquille applicative (nav) sur /connexion", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page.locator(".sidebar")).toHaveCount(0);
  });
});
