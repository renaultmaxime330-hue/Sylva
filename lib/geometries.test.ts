import { describe, it, expect } from "vitest";
import { surfaceHa, longueurM } from "./geometries";

describe("surfaceHa", () => {
  it("calcule la surface d'un polygone en hectares", () => {
    // ~1km x ~1km autour de l'équateur ≈ 100 ha
    const carre = {
      type: "Polygon" as const,
      coordinates: [[
        [0, 0], [0.009, 0], [0.009, 0.009], [0, 0.009], [0, 0],
      ] as [number, number][]],
    };
    const ha = surfaceHa(carre);
    expect(ha).toBeGreaterThan(90);
    expect(ha).toBeLessThan(110);
  });

  it("retourne undefined pour un type non-Polygon", () => {
    expect(surfaceHa({ type: "Point", coordinates: [0, 0] })).toBeUndefined();
    expect(surfaceHa({ type: "LineString", coordinates: [[0, 0], [1, 1]] })).toBeUndefined();
  });
});

describe("longueurM", () => {
  it("calcule la longueur d'une ligne en mètres (haversine)", () => {
    // 1° de longitude à l'équateur ≈ 111 320 m
    const ligne = { type: "LineString" as const, coordinates: [[0, 0], [1, 0]] as [number, number][] };
    const m = longueurM(ligne);
    expect(m).toBeGreaterThan(110_000);
    expect(m).toBeLessThan(112_000);
  });

  it("additionne plusieurs segments", () => {
    const troisPoints = { type: "LineString" as const, coordinates: [[0, 0], [1, 0], [1, 1]] as [number, number][] };
    const deuxPoints = { type: "LineString" as const, coordinates: [[0, 0], [1, 0]] as [number, number][] };
    expect(longueurM(troisPoints)!).toBeGreaterThan(longueurM(deuxPoints)!);
  });

  it("retourne undefined pour un type non-LineString", () => {
    expect(longueurM({ type: "Point", coordinates: [0, 0] })).toBeUndefined();
  });
});
