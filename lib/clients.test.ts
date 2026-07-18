import { describe, it, expect } from "vitest";
import { chantiersDeClient } from "./clients";
import type { Client, Chantier } from "./db";

function client(nom: string): Client {
  return { id: "c1", nom, notes: "", createdAt: "", updatedAt: "" };
}
function chantier(overrides: Partial<Chantier>): Chantier {
  return {
    id: overrides.id ?? "ch1", nom: "Chantier", proprietaire: "", client: "",
    numParcelle: "", commune: "", typePeuplement: "", essence: "",
    statut: "a_faire", notes: "", createdAt: "", updatedAt: "", ...overrides,
  };
}

describe("chantiersDeClient", () => {
  it("associe par correspondance exacte du propriétaire", () => {
    const c = client("M. Lartigue");
    const chantiers = [chantier({ id: "1", proprietaire: "M. Lartigue" }), chantier({ id: "2", proprietaire: "Autre" })];
    expect(chantiersDeClient(c, chantiers).map((x) => x.id)).toEqual(["1"]);
  });

  it("associe par correspondance exacte du champ client (donneur d'ordre)", () => {
    const c = client("GF de Sabres");
    const chantiers = [chantier({ id: "1", client: "GF de Sabres" })];
    expect(chantiersDeClient(c, chantiers).map((x) => x.id)).toEqual(["1"]);
  });

  it("ignore la casse et les accents", () => {
    const c = client("Éric Lartigue");
    const chantiers = [chantier({ id: "1", proprietaire: "eric lartigue" })];
    expect(chantiersDeClient(c, chantiers).map((x) => x.id)).toEqual(["1"]);
  });

  it("accepte une correspondance partielle si le champ du chantier fait plus de 2 caractères", () => {
    const c = client("Lartigue");
    const chantiers = [chantier({ id: "1", proprietaire: "M. Lartigue (héritiers)" })];
    expect(chantiersDeClient(c, chantiers).map((x) => x.id)).toEqual(["1"]);
  });

  it("le garde-fou de longueur bloque un sous-champ trivialement court même s'il contient le terme", () => {
    // "ab" contiendrait bien "a" en sous-chaîne, mais le champ propriétaire
    // ne fait que 2 caractères (pas > 2) : le garde-fou bloque ce cas, seule
    // l'égalité stricte aurait compté.
    const c = client("A");
    const chantiers = [chantier({ id: "1", proprietaire: "ab" })];
    expect(chantiersDeClient(c, chantiers)).toEqual([]);
  });

  it("ne fait pas de correspondance si le terme n'est pas une sous-chaîne", () => {
    const c = client("Le");
    const chantiers = [chantier({ id: "1", proprietaire: "Un Autre Domaine" })];
    expect(chantiersDeClient(c, chantiers)).toEqual([]);
  });

  it("retourne un tableau vide si le client n'a pas de nom", () => {
    const c = client("");
    const chantiers = [chantier({ id: "1", proprietaire: "Quelqu'un" })];
    expect(chantiersDeClient(c, chantiers)).toEqual([]);
  });

  it("ne retourne rien si aucun chantier ne correspond", () => {
    const c = client("Personne");
    const chantiers = [chantier({ id: "1", proprietaire: "Un Autre" })];
    expect(chantiersDeClient(c, chantiers)).toEqual([]);
  });
});
