import { describe, it, expect } from "vitest";
import { heuresTravaillees, rendementJournee, nbArbres, agreger, dansPeriode } from "./production";
import type { Journee } from "./db";

function journee(overrides: Partial<Journee>): Journee {
  return {
    id: "j1", chantierId: "ch1", date: "2026-01-01", notes: "",
    createdAt: "", updatedAt: "", ...overrides,
  };
}

describe("heuresTravaillees", () => {
  it("calcule la durée moins la pause", () => {
    expect(heuresTravaillees({ heureDebut: "08:00", heureFin: "17:00", pauseMin: 60 })).toBe(8);
  });

  it("gère le passage de minuit", () => {
    expect(heuresTravaillees({ heureDebut: "22:00", heureFin: "02:00", pauseMin: 0 })).toBe(4);
  });

  it("retourne undefined si une heure manque", () => {
    expect(heuresTravaillees({ heureDebut: undefined, heureFin: "17:00", pauseMin: 0 })).toBeUndefined();
    expect(heuresTravaillees({ heureDebut: "08:00", heureFin: undefined, pauseMin: 0 })).toBeUndefined();
  });

  it("ne descend jamais sous zéro (pause plus longue que la plage)", () => {
    expect(heuresTravaillees({ heureDebut: "08:00", heureFin: "09:00", pauseMin: 120 })).toBe(0);
  });
});

describe("rendementJournee", () => {
  it("calcule le m³/h machine", () => {
    expect(rendementJournee(journee({ volumeM3: 48, hMachine: 8 }))).toBe(6);
  });

  it("undefined sans heures machine", () => {
    expect(rendementJournee(journee({ volumeM3: 48, hMachine: 0 }))).toBeUndefined();
    expect(rendementJournee(journee({ volumeM3: 48, hMachine: undefined }))).toBeUndefined();
  });

  it("undefined sans volume", () => {
    expect(rendementJournee(journee({ volumeM3: undefined, hMachine: 8 }))).toBeUndefined();
  });
});

describe("nbArbres", () => {
  it("additionne pins et autres essences", () => {
    expect(nbArbres(journee({ nbPins: 10, nbAutres: 4 }))).toBe(14);
  });
  it("traite les champs manquants comme 0", () => {
    expect(nbArbres(journee({}))).toBe(0);
  });
});

describe("agreger", () => {
  it("cumule volume, heures et calcule le rendement moyen", () => {
    const t = agreger([
      journee({ volumeM3: 40, nbPins: 5, nbAutres: 1, hMachine: 5, heureDebut: "08:00", heureFin: "13:00", pauseMin: 0 }),
      journee({ volumeM3: 20, nbPins: 2, nbAutres: 0, hMachine: 5, heureDebut: "08:00", heureFin: "13:00", pauseMin: 0 }),
    ]);
    expect(t.volume).toBe(60);
    expect(t.arbres).toBe(8);
    expect(t.hMachine).toBe(10);
    expect(t.heures).toBe(10);
    expect(t.rendement).toBe(6); // 60/10
    expect(t.nbJours).toBe(2);
  });

  it("liste vide → tout à zéro, rendement indéfini", () => {
    const t = agreger([]);
    expect(t.volume).toBe(0);
    expect(t.rendement).toBeUndefined();
    expect(t.nbJours).toBe(0);
  });
});

describe("dansPeriode", () => {
  it("une date d'aujourd'hui est dans la période jour", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(dansPeriode(today, "jour")).toBe(true);
  });

  it("une date d'il y a 2 jours n'est pas dans la période jour", () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    expect(dansPeriode(d.toISOString().slice(0, 10), "jour")).toBe(false);
  });

  it("une date du mois courant est dans la période mois", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(dansPeriode(today.slice(0, 8) + "01", "mois")).toBe(true);
  });

  it("une date de l'an dernier n'est pas dans la période année", () => {
    const l = new Date().getFullYear() - 1;
    expect(dansPeriode(`${l}-06-15`, "annee")).toBe(false);
  });
});
