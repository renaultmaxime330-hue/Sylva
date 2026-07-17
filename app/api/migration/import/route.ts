import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import {
  teamMembers, clients, chantiers, geometries, journees, engins, entretiens,
  materiel, finances, factures, factureSequences,
} from "@/lib/server/db/schema";
import { utilisateurCourant } from "@/lib/server/auth/session";

/* Rapatrie une sauvegarde JSON produite par l'ancienne app locale
   (lib/backup.ts → exporterSauvegarde(), format { app:"sylva", ... }) dans
   la nouvelle base d'équipe. Photos/documents hors périmètre (retirés,
   décision utilisateur — reposaient sur des Blobs IndexedDB).

   Chaque ligne importée reçoit un NOUVEL id serveur ; les références
   croisées (chantierId, enginId, clientId…) sont réécrites via des tables
   de correspondance construites au fil de l'import, DANS L'ORDRE des
   dépendances (clients et engins avant ce qui les référence). */

type Ligne = Record<string, unknown>;

function tableau(v: unknown): Ligne[] {
  return Array.isArray(v) ? (v as Ligne[]) : [];
}
function texte(v: unknown, defaut = ""): string {
  return typeof v === "string" ? v : defaut;
}
function nombre(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function entier(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;
}
/** Chaîne "YYYY-MM-DD" valide, ou null — jamais "" (le type `date` de
    Postgres la rejette, contrairement à Dexie qui l'acceptait). */
function dateISOOuNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
/** Idem, mais pour une colonne `date` NOT NULL : repli sur aujourd'hui. */
function dateISOOuAujourdhui(v: unknown): string {
  return dateISOOuNull(v) ?? new Date().toISOString().slice(0, 10);
}
function date(v: unknown): Date {
  const d = typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : new Date();
}

/** Extrait { prefixe, annee, n } de "D-2026-003" / "F-2026-012" — best-effort. */
function analyserNumero(numero: string): { annee: number; n: number } | null {
  const m = /-(\d{4})-(\d+)$/.exec(numero);
  if (!m) return null;
  return { annee: Number(m[1]), n: Number(m[2]) };
}

export async function POST(req: Request) {
  const u = await utilisateurCourant(req);
  if (!u) return NextResponse.json({ erreur: "Non connecté." }, { status: 401 });

  const [mem] = await db.select({ teamId: teamMembers.teamId }).from(teamMembers)
    .where(eq(teamMembers.userId, u.id)).limit(1);
  if (!mem) return NextResponse.json({ erreur: "Rejoins ou crée une équipe avant d'importer." }, { status: 400 });
  const teamId = mem.teamId;

  const data = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!data || data.app !== "sylva") {
    return NextResponse.json({ erreur: "Ce fichier n'est pas une sauvegarde Sylva." }, { status: 400 });
  }

  const resultat = await db.transaction(async (tx) => {
    const idClients = new Map<string, string>();
    const idChantiers = new Map<string, string>();
    const idEngins = new Map<string, string>();

    // --- clients (aucune dépendance) ---
    for (const c of tableau(data.clients)) {
      const [row] = await tx.insert(clients).values({
        teamId, nom: texte(c.nom, "Sans nom"), adresse: texte(c.adresse) || null,
        commune: texte(c.commune) || null, telephone: texte(c.telephone) || null, email: texte(c.email) || null,
        notes: texte(c.notes), createdAt: date(c.createdAt), updatedAt: date(c.updatedAt),
      }).returning({ id: clients.id });
      if (typeof c.id === "string") idClients.set(c.id, row.id);
    }

    // --- chantiers (pas de clientId dans l'ancien format — relation par nom libre uniquement) ---
    for (const c of tableau(data.chantiers)) {
      const [row] = await tx.insert(chantiers).values({
        teamId, nom: texte(c.nom, "Sans nom"), proprietaire: texte(c.proprietaire), client: texte(c.client),
        numParcelle: texte(c.numParcelle), commune: texte(c.commune),
        lat: nombre(c.lat), lng: nombre(c.lng), surfaceHa: nombre(c.surfaceHa),
        typePeuplement: texte(c.typePeuplement), essence: texte(c.essence),
        dateDebut: dateISOOuNull(c.dateDebut),
        dateFin: dateISOOuNull(c.dateFin),
        statut: (["a_faire", "en_cours", "termine"].includes(c.statut as string) ? c.statut : "a_faire") as "a_faire" | "en_cours" | "termine",
        notes: texte(c.notes), volumes: c.volumes ?? null, createdBy: u.id,
        createdAt: date(c.createdAt), updatedAt: date(c.updatedAt),
      }).returning({ id: chantiers.id });
      if (typeof c.id === "string") idChantiers.set(c.id, row.id);
    }

    // --- géométries (dépendent de chantiers) ---
    let geomIgnorees = 0;
    for (const g of tableau(data.geometries)) {
      const chantierId = idChantiers.get(String(g.chantierId));
      if (!chantierId) { geomIgnorees++; continue; }
      await tx.insert(geometries).values({
        teamId, chantierId, type: g.type as never, nom: texte(g.nom, "Sans nom"), couleur: texte(g.couleur, "#2E6B41"),
        geojson: g.geojson, surfaceHa: nombre(g.surfaceHa), longueurM: nombre(g.longueurM), createdBy: u.id,
        createdAt: date(g.createdAt), updatedAt: date(g.updatedAt ?? g.createdAt),
      });
    }

    // --- journées (dépendent de chantiers) ---
    let journeesIgnorees = 0;
    for (const j of tableau(data.journees)) {
      const chantierId = idChantiers.get(String(j.chantierId));
      if (!chantierId) { journeesIgnorees++; continue; }
      await tx.insert(journees).values({
        teamId, chantierId, date: dateISOOuAujourdhui(j.date),
        volumeM3: nombre(j.volumeM3), nbPins: entier(j.nbPins), nbAutres: entier(j.nbAutres),
        heureDebut: typeof j.heureDebut === "string" ? j.heureDebut : null,
        heureFin: typeof j.heureFin === "string" ? j.heureFin : null,
        pauseMin: entier(j.pauseMin), hMachine: nombre(j.hMachine), hDeplacement: nombre(j.hDeplacement),
        notes: texte(j.notes), createdBy: u.id, createdAt: date(j.createdAt), updatedAt: date(j.updatedAt),
      });
    }

    // --- engins (aucune dépendance) ---
    for (const e of tableau(data.engins)) {
      const [row] = await tx.insert(engins).values({
        teamId, type: e.type as never, nom: texte(e.nom, "Sans nom"), marque: texte(e.marque) || null,
        modele: texte(e.modele) || null, heuresTotal: nombre(e.heuresTotal), seuilEntretienH: nombre(e.seuilEntretienH),
        actif: e.actif !== false, notes: texte(e.notes), createdAt: date(e.createdAt), updatedAt: date(e.updatedAt),
      }).returning({ id: engins.id });
      if (typeof e.id === "string") idEngins.set(e.id, row.id);
    }

    // --- entretiens (dépendent d'engins) ---
    let entretiensIgnores = 0;
    for (const e of tableau(data.entretiens)) {
      const enginId = idEngins.get(String(e.enginId));
      if (!enginId) { entretiensIgnores++; continue; }
      await tx.insert(entretiens).values({
        teamId, enginId, type: e.type as never, date: dateISOOuAujourdhui(e.date),
        heuresCompteur: nombre(e.heuresCompteur), cout: nombre(e.cout), carburantL: nombre(e.carburantL),
        huile: e.huile === true, notes: texte(e.notes), createdBy: u.id, createdAt: date(e.createdAt),
      });
    }

    // --- matériel (aucune dépendance) ---
    for (const m of tableau(data.materiel)) {
      await tx.insert(materiel).values({
        teamId, categorie: m.categorie as never, nom: texte(m.nom, "Sans nom"), quantite: nombre(m.quantite) ?? 0,
        unite: texte(m.unite), seuilAlerte: nombre(m.seuilAlerte), notes: texte(m.notes),
        createdAt: date(m.createdAt), updatedAt: date(m.updatedAt),
      });
    }

    // --- finances (chantierId optionnel) ---
    for (const f of tableau(data.finances)) {
      const chantierId = f.chantierId ? idChantiers.get(String(f.chantierId)) ?? null : null;
      await tx.insert(finances).values({
        teamId, chantierId, type: f.type as never, categorie: texte(f.categorie, "Autre"),
        libelle: texte(f.libelle), montant: nombre(f.montant) ?? 0,
        date: dateISOOuAujourdhui(f.date), createdBy: u.id,
        createdAt: date(f.createdAt), updatedAt: date(f.updatedAt),
      });
    }

    // --- devis/factures (clientId et chantierId optionnels, numéro conservé) ---
    const derniersN = new Map<string, number>(); // clé "type:annee" → n max rencontré
    for (const d of tableau(data.factures)) {
      const clientId = d.clientId ? idClients.get(String(d.clientId)) ?? null : null;
      const chantierId = d.chantierId ? idChantiers.get(String(d.chantierId)) ?? null : null;
      const numero = texte(d.numero, "");
      await tx.insert(factures).values({
        teamId, type: d.type as never, numero, clientId, clientNom: texte(d.clientNom),
        clientAdresse: texte(d.clientAdresse) || null, chantierId,
        date: dateISOOuAujourdhui(d.date),
        dateEcheance: dateISOOuNull(d.dateEcheance),
        lignes: d.lignes ?? [], tva: nombre(d.tva) ?? 0, notes: texte(d.notes),
        statut: (d.statut as string) as never, createdBy: u.id,
        createdAt: date(d.createdAt), updatedAt: date(d.updatedAt),
      });
      const analyse = analyserNumero(numero);
      if (analyse) {
        const cle = `${d.type}:${analyse.annee}`;
        derniersN.set(cle, Math.max(derniersN.get(cle) ?? 0, analyse.n));
      }
    }
    // Le prochain numéro généré doit repartir APRÈS le plus grand numéro importé,
    // sinon la première facture créée après l'import entre en collision.
    for (const [cle, n] of derniersN) {
      const [type, anneeStr] = cle.split(":");
      await tx.insert(factureSequences).values({ teamId, type: type as never, annee: Number(anneeStr), nextN: n + 1 })
        .onConflictDoUpdate({
          target: [factureSequences.teamId, factureSequences.type, factureSequences.annee],
          set: { nextN: sql`greatest(${factureSequences.nextN}, ${n + 1})` },
        });
    }

    return {
      clients: idClients.size, chantiers: idChantiers.size,
      geometries: tableau(data.geometries).length - geomIgnorees,
      journees: tableau(data.journees).length - journeesIgnorees,
      engins: idEngins.size,
      entretiens: tableau(data.entretiens).length - entretiensIgnores,
      materiel: tableau(data.materiel).length,
      finances: tableau(data.finances).length,
      factures: tableau(data.factures).length,
      ignores: geomIgnorees + journeesIgnorees + entretiensIgnores,
    };
  });

  return NextResponse.json(resultat);
}
