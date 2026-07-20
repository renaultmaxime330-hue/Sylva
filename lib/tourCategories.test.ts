import { describe, it, expect } from "vitest";
import { agregerTours } from "./tourCategories";
import type { TourCategorie, Journee } from "./db";

function categorie(overrides: Partial<TourCategorie>): TourCategorie {
  return {
    id: "c1", nom: "Test", couleur: "#000", coefficientSterage: 0.7, ordre: 0, actif: true,
    createdAt: "", updatedAt: "", ...overrides,
  };
}

describe("agregerTours", () => {
  it("calcule stères puis m³ plein via les deux coefficients de la catégorie", () => {
    const cats = [categorie({ id: "pins", nom: "Pins", capaciteTourSteres: 10, coefficientSterage: 0.7, ordre: 0 })];
    const journees: Pick<Journee, "tours">[] = [{ tours: { pins: 3 } }, { tours: { pins: 1.5 } }];
    const r = agregerTours(journees, cats);
    expect(r.totalTours).toBe(4.5);
    expect(r.totalSteres).toBe(45); // 4.5 tours × 10 stères
    expect(r.totalM3Plein).toBe(31.5); // 45 stères × 0.7
    expect(r.categoriesNonConfigurees).toEqual([]);
  });

  it("signale les catégories utilisées sans capacité configurée, sans inventer de volume", () => {
    const cats = [categorie({ id: "canter", nom: "Canter", capaciteTourSteres: undefined })];
    const journees: Pick<Journee, "tours">[] = [{ tours: { canter: 5 } }];
    const r = agregerTours(journees, cats);
    expect(r.totalTours).toBe(5);
    expect(r.totalSteres).toBe(0);
    expect(r.categoriesNonConfigurees).toEqual(["Canter"]);
    expect(r.lignes[0].steres).toBeNull();
  });

  it("une catégorie inactive et jamais utilisée n'apparaît pas dans les lignes", () => {
    const cats = [
      categorie({ id: "a", nom: "Active", actif: true }),
      categorie({ id: "b", nom: "Archivée", actif: false }),
    ];
    const r = agregerTours([{ tours: {} }], cats);
    expect(r.lignes.map((l) => l.categorie.id)).toEqual(["a"]);
  });

  it("liste de journées vide → tout à zéro", () => {
    const r = agregerTours([], [categorie({ id: "x" })]);
    expect(r.totalTours).toBe(0);
    expect(r.totalSteres).toBe(0);
    expect(r.totalM3Plein).toBe(0);
  });
});
