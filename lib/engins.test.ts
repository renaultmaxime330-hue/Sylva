import { describe, it, expect } from "vitest";
import { alerteEntretien } from "./engins";
import type { Engin, Entretien } from "./db";

function engin(overrides: Partial<Engin>): Engin {
  return {
    id: "e1", type: "troncon", nom: "Tronçonneuse", actif: true, notes: "",
    createdAt: "", updatedAt: "", ...overrides,
  };
}
function entretien(overrides: Partial<Entretien>): Entretien {
  return {
    id: "t1", enginId: "e1", type: "entretien", date: "2026-01-01", huile: false, notes: "",
    createdAt: "", ...overrides,
  };
}

describe("alerteEntretien", () => {
  it("aucune alerte si le seuil ou le compteur n'est pas renseigné", () => {
    expect(alerteEntretien(engin({ seuilEntretienH: undefined, heuresTotal: 100 }), []).niveau).toBe("aucun");
    expect(alerteEntretien(engin({ seuilEntretienH: 200, heuresTotal: undefined }), []).niveau).toBe("aucun");
    expect(alerteEntretien(engin({ seuilEntretienH: 0, heuresTotal: 100 }), []).niveau).toBe("aucun");
  });

  it("ok si largement sous le seuil, sans entretien enregistré", () => {
    const a = alerteEntretien(engin({ seuilEntretienH: 200, heuresTotal: 50 }), []);
    expect(a.niveau).toBe("ok");
    expect(a.reste).toBe(150);
  });

  it("dépassé si le compteur excède le seuil depuis le dernier entretien", () => {
    const a = alerteEntretien(engin({ seuilEntretienH: 200, heuresTotal: 250 }), []);
    expect(a.niveau).toBe("depasse");
    expect(a.reste).toBe(-50);
  });

  it("bientôt dans la zone d'alerte (≤15% du seuil ou 5h, le plus grand)", () => {
    // seuil 200h → zone d'alerte = 30h (15% de 200)
    const a = alerteEntretien(engin({ seuilEntretienH: 200, heuresTotal: 175 }), []);
    expect(a.niveau).toBe("bientot");
  });

  it("le plancher de 5h s'applique même si 15% du seuil est plus petit", () => {
    // seuil 20h → 15% = 3h, mais le plancher est 5h
    const a = alerteEntretien(engin({ seuilEntretienH: 20, heuresTotal: 16 }), []); // reste = 4h < 5h
    expect(a.niveau).toBe("bientot");
  });

  it("tient compte du dernier entretien pour recalculer les heures écoulées", () => {
    const ents = [entretien({ type: "entretien", heuresCompteur: 200 })];
    // compteur actuel 250h, mais entretien fait à 200h → seulement 50h depuis
    const a = alerteEntretien(engin({ seuilEntretienH: 200, heuresTotal: 250 }), ents);
    expect(a.niveau).toBe("ok");
    expect(a.heuresDepuis).toBe(50);
  });

  it("prend le plus récent (le plus haut compteur) parmi plusieurs entretiens", () => {
    const ents = [
      entretien({ type: "entretien", heuresCompteur: 100 }),
      entretien({ type: "revision", heuresCompteur: 220 }),
      entretien({ type: "entretien", heuresCompteur: 180 }),
    ];
    const a = alerteEntretien(engin({ seuilEntretienH: 200, heuresTotal: 250 }), ents);
    expect(a.heuresDepuis).toBe(30); // 250 - 220
  });

  it("ignore les réparations pour le calcul du dernier entretien", () => {
    const ents = [entretien({ type: "reparation", heuresCompteur: 240 })];
    const a = alerteEntretien(engin({ seuilEntretienH: 200, heuresTotal: 250 }), ents);
    expect(a.heuresDepuis).toBe(250); // la réparation à 240h ne compte pas
    expect(a.niveau).toBe("depasse");
  });
});
