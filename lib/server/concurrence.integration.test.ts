import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db/client";
import { users, teams, materiel, factureSequences } from "./db/schema";

/* Tests d'intégration contre la vraie base (Railway, .env.local) — pas de
   base de test séparée à cette échelle (voir la note de la Phase 11 dans la
   mémoire du projet : proportionné à une équipe de 2, pas d'infra dédiée).
   Toutes les données créées ici sont scopées à une équipe jetable, détruite
   à la fin (cascade sur team_id efface tout ce qui en dépend). */

let teamId: string;
let userId: string;

beforeAll(async () => {
  const [u] = await db.insert(users).values({
    email: `vitest-${crypto.randomUUID()}@example.invalid`,
    passwordHash: "x", nom: "Vitest", role: "abatteur",
  }).returning({ id: users.id });
  userId = u.id;
  const [t] = await db.insert(teams).values({ ownerId: userId, code: crypto.randomUUID().slice(0, 6).toUpperCase() })
    .returning({ id: teams.id });
  teamId = t.id;
});

afterAll(async () => {
  await db.delete(teams).where(eq(teams.id, teamId)); // cascade : materiel, facture_sequences…
  await db.delete(users).where(eq(users.id, userId));
});

describe("ajustement atomique de quantité (matériel)", () => {
  it("aucune mise à jour perdue sous des ajustements concurrents", async () => {
    const [row] = await db.insert(materiel).values({
      teamId, categorie: "chaine", nom: "Test concurrence", quantite: 100,
    }).returning({ id: materiel.id });

    // 20 ajustements concurrents (+3 et -2 en alternance) → somme nette +10.
    const deltas = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 3 : -2));
    await Promise.all(deltas.map((delta) =>
      db.update(materiel)
        .set({ quantite: sql`greatest(0, round((${materiel.quantite} + ${delta})::numeric, 2))` })
        .where(and(eq(materiel.id, row.id), eq(materiel.teamId, teamId)))
    ));

    const [final] = await db.select({ quantite: materiel.quantite }).from(materiel).where(eq(materiel.id, row.id));
    expect(final.quantite).toBe(100 + deltas.reduce((s, d) => s + d, 0));
  });

  it("ne descend jamais sous zéro même avec des décréments concurrents massifs", async () => {
    const [row] = await db.insert(materiel).values({
      teamId, categorie: "chaine", nom: "Test plancher", quantite: 5,
    }).returning({ id: materiel.id });

    // 10 décréments de 3 en parallèle sur un stock de 5 → doit finir à 0, jamais négatif.
    await Promise.all(Array.from({ length: 10 }, () =>
      db.update(materiel)
        .set({ quantite: sql`greatest(0, round((${materiel.quantite} + (-3))::numeric, 2))` })
        .where(and(eq(materiel.id, row.id), eq(materiel.teamId, teamId)))
    ));

    const [final] = await db.select({ quantite: materiel.quantite }).from(materiel).where(eq(materiel.id, row.id));
    expect(final.quantite).toBe(0);
  });
});

describe("compteur de numérotation des factures (auto-cicatrisant)", () => {
  it("retient toujours le plus grand next_n sous des mises à jour concurrentes", async () => {
    const annee = 2026;
    // Simule des factures créées dans le désordre (numéros 3, 7, 1, 12, 5) —
    // le compteur doit finir à max+1 = 13, peu importe l'ordre d'arrivée.
    const numeros = [3, 7, 1, 12, 5];
    await Promise.all(numeros.map((n) =>
      db.insert(factureSequences).values({ teamId, type: "devis", annee, nextN: n + 1 })
        .onConflictDoUpdate({
          target: [factureSequences.teamId, factureSequences.type, factureSequences.annee],
          set: { nextN: sql`greatest(${factureSequences.nextN}, ${n + 1})` },
        })
    ));

    const [row] = await db.select({ nextN: factureSequences.nextN }).from(factureSequences)
      .where(and(eq(factureSequences.teamId, teamId), eq(factureSequences.type, "devis"), eq(factureSequences.annee, annee)));
    expect(row.nextN).toBe(13);
  });

  it("les types devis et facture ont des compteurs indépendants", async () => {
    const annee = 2027;
    await db.insert(factureSequences).values({ teamId, type: "devis", annee, nextN: 5 })
      .onConflictDoUpdate({ target: [factureSequences.teamId, factureSequences.type, factureSequences.annee], set: { nextN: 5 } });
    await db.insert(factureSequences).values({ teamId, type: "facture", annee, nextN: 9 })
      .onConflictDoUpdate({ target: [factureSequences.teamId, factureSequences.type, factureSequences.annee], set: { nextN: 9 } });

    const lignes = await db.select().from(factureSequences)
      .where(and(eq(factureSequences.teamId, teamId), eq(factureSequences.annee, annee)));
    expect(lignes.find((l) => l.type === "devis")?.nextN).toBe(5);
    expect(lignes.find((l) => l.type === "facture")?.nextN).toBe(9);
  });
});
