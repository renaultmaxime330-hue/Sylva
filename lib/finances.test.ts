import { describe, it, expect } from "vitest";
import { bilan } from "./finances";
import type { Finance } from "./db";

function ligne(overrides: Partial<Finance>): Finance {
  return {
    id: "f1", type: "recette", categorie: "", libelle: "", montant: 0, date: "2026-01-01",
    createdAt: "", updatedAt: "", ...overrides,
  };
}

describe("bilan", () => {
  it("calcule recettes, dépenses, marge et rentabilité", () => {
    const b = bilan([
      ligne({ type: "recette", montant: 1000 }),
      ligne({ type: "recette", montant: 500 }),
      ligne({ type: "depense", montant: 300 }),
    ]);
    expect(b.recettes).toBe(1500);
    expect(b.depenses).toBe(300);
    expect(b.marge).toBe(1200);
    expect(b.rentabilite).toBe(80); // 1200/1500 * 100
  });

  it("rentabilité indéfinie sans recettes", () => {
    const b = bilan([ligne({ type: "depense", montant: 100 })]);
    expect(b.rentabilite).toBeUndefined();
    expect(b.marge).toBe(-100);
  });

  it("liste vide → tout à zéro", () => {
    const b = bilan([]);
    expect(b).toEqual({ recettes: 0, depenses: 0, marge: 0, rentabilite: undefined });
  });

  it("marge négative si les dépenses dépassent les recettes", () => {
    const b = bilan([ligne({ type: "recette", montant: 100 }), ligne({ type: "depense", montant: 400 })]);
    expect(b.marge).toBe(-300);
    expect(b.rentabilite).toBe(-300);
  });
});
