import { describe, it, expect } from "vitest";
import { stockBas } from "./materiel";
import type { Materiel } from "./db";

function article(overrides: Partial<Materiel>): Materiel {
  return {
    id: "m1", categorie: "chaine", nom: "Chaîne", quantite: 0, unite: "u", notes: "",
    createdAt: "", updatedAt: "", ...overrides,
  };
}

describe("stockBas", () => {
  it("vrai quand la quantité est sous le seuil", () => {
    expect(stockBas(article({ quantite: 2, seuilAlerte: 4 }))).toBe(true);
  });
  it("vrai quand la quantité est exactement au seuil", () => {
    expect(stockBas(article({ quantite: 4, seuilAlerte: 4 }))).toBe(true);
  });
  it("faux quand la quantité est au-dessus du seuil", () => {
    expect(stockBas(article({ quantite: 5, seuilAlerte: 4 }))).toBe(false);
  });
  it("faux si aucun seuil n'est défini", () => {
    expect(stockBas(article({ quantite: 0, seuilAlerte: undefined }))).toBe(false);
  });
});
