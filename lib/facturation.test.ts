import { describe, it, expect } from "vitest";
import { totalLigne, totauxDoc } from "./facturation";

describe("totalLigne", () => {
  it("multiplie quantité et prix unitaire", () => {
    expect(totalLigne({ designation: "", quantite: 3, unite: "m³", prixUnitaire: 150 })).toBe(450);
  });

  it("arrondit à 2 décimales", () => {
    expect(totalLigne({ designation: "", quantite: 3, unite: "u", prixUnitaire: 0.1 })).toBeCloseTo(0.3, 2);
  });

  it("traite une quantité ou un prix manquant comme 0", () => {
    expect(totalLigne({ designation: "", quantite: 0, unite: "u", prixUnitaire: 100 })).toBe(0);
  });
});

describe("totauxDoc", () => {
  it("calcule HT, TVA et TTC sur plusieurs lignes", () => {
    const t = totauxDoc({
      lignes: [
        { designation: "A", quantite: 1, unite: "u", prixUnitaire: 100 },
        { designation: "B", quantite: 2, unite: "u", prixUnitaire: 50 },
      ],
      tva: 20,
    });
    expect(t.ht).toBe(200);
    expect(t.tvaMontant).toBe(40);
    expect(t.ttc).toBe(240);
  });

  it("TVA à 0 % laisse le TTC égal au HT", () => {
    const t = totauxDoc({ lignes: [{ designation: "A", quantite: 1, unite: "u", prixUnitaire: 150 }], tva: 0 });
    expect(t.tvaMontant).toBe(0);
    expect(t.ttc).toBe(150);
  });

  it("document sans lignes → tout à zéro", () => {
    const t = totauxDoc({ lignes: [], tva: 20 });
    expect(t).toEqual({ ht: 0, tvaMontant: 0, ttc: 0 });
  });
});
