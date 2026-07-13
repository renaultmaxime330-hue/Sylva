import { db, newId, type Journee } from "./db";

/* ============================================================
   Production & temps de travail — journées, calculs, agrégations.
   ============================================================ */

export type JourneeInput = Omit<Journee, "id" | "createdAt" | "updatedAt" | "syncStatus">;

export function champsVidesJournee(chantierId = ""): JourneeInput {
  return {
    chantierId,
    date: new Date().toISOString().slice(0, 10),
    volumeM3: undefined,
    nbPins: undefined,
    nbAutres: undefined,
    heureDebut: "",
    heureFin: "",
    pauseMin: undefined,
    hMachine: undefined,
    hDeplacement: undefined,
    notes: "",
  };
}

export async function creerJournee(data: JourneeInput): Promise<string> {
  const now = new Date().toISOString();
  const id = newId();
  await db.journees.add({ ...data, id, createdAt: now, updatedAt: now, syncStatus: "local" });
  return id;
}

export async function modifierJournee(id: string, data: Partial<JourneeInput>): Promise<void> {
  await db.journees.update(id, { ...data, updatedAt: new Date().toISOString(), syncStatus: "local" });
}

export async function supprimerJournee(id: string): Promise<void> {
  await db.journees.delete(id);
}

/* ---------- Calculs sur une journée ---------- */

function toMinutes(hhmm?: string): number | undefined {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return undefined;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Heures travaillées = (fin - début) - pause, en heures décimales. */
export function heuresTravaillees(j: Pick<Journee, "heureDebut" | "heureFin" | "pauseMin">): number | undefined {
  const d = toMinutes(j.heureDebut);
  const f = toMinutes(j.heureFin);
  if (d == null || f == null) return undefined;
  let diff = f - d;
  if (diff < 0) diff += 24 * 60; // passe minuit
  diff -= j.pauseMin ?? 0;
  if (diff <= 0) return 0;
  return Math.round((diff / 60) * 100) / 100;
}

/** Rendement m³ par heure MACHINE (temps réel de coupe). */
export function rendementJournee(j: Journee): number | undefined {
  if (!j.hMachine || j.hMachine <= 0 || j.volumeM3 == null) return undefined;
  return Math.round((j.volumeM3 / j.hMachine) * 100) / 100;
}

export function nbArbres(j: Journee): number {
  return (j.nbPins ?? 0) + (j.nbAutres ?? 0);
}

/* ---------- Agrégations ---------- */

export interface Totaux {
  volume: number;
  arbres: number;
  pins: number;
  autres: number;
  heures: number;
  hMachine: number;
  hDeplacement: number;
  rendement: number | undefined; // m³/h moyen
  nbJours: number;
}

export function agreger(journees: Journee[]): Totaux {
  let volume = 0, arbres = 0, pins = 0, autres = 0, heures = 0, hMachine = 0, hDeplacement = 0;
  for (const j of journees) {
    volume += j.volumeM3 ?? 0;
    pins += j.nbPins ?? 0;
    autres += j.nbAutres ?? 0;
    arbres += nbArbres(j);
    heures += heuresTravaillees(j) ?? 0;
    hMachine += j.hMachine ?? 0;
    hDeplacement += j.hDeplacement ?? 0;
  }
  return {
    volume: Math.round(volume * 100) / 100,
    arbres, pins, autres,
    heures: Math.round(heures * 100) / 100,
    hMachine: Math.round(hMachine * 100) / 100,
    hDeplacement: Math.round(hDeplacement * 100) / 100,
    rendement: hMachine > 0 ? Math.round((volume / hMachine) * 100) / 100 : undefined,
    nbJours: journees.length,
  };
}

/* ---------- Filtres par période ---------- */

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function filtrePeriode(journees: Journee[], periode: "jour" | "semaine" | "mois" | "annee"): Journee[] {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const wStart = startOfWeek(now);
  const ym = today.slice(0, 7);
  const y = today.slice(0, 4);
  return journees.filter((j) => {
    if (periode === "jour") return j.date === today;
    if (periode === "mois") return j.date.slice(0, 7) === ym;
    if (periode === "annee") return j.date.slice(0, 4) === y;
    // semaine
    const jd = new Date(j.date + "T00:00:00");
    return jd >= wStart && jd <= now;
  });
}

/** Série m³ par jour sur les N derniers jours (pour le graphique). */
export function serieParJour(journees: Journee[], nbJours = 14): { date: string; label: string; volume: number }[] {
  const map = new Map<string, number>();
  for (const j of journees) map.set(j.date, (map.get(j.date) ?? 0) + (j.volumeM3 ?? 0));
  const out: { date: string; label: string; volume: number }[] = [];
  const now = new Date();
  for (let i = nbJours - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      date: iso,
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      volume: Math.round((map.get(iso) ?? 0) * 100) / 100,
    });
  }
  return out;
}

/** Série m³ par mois sur les 12 derniers mois. */
export function serieParMois(journees: Journee[]): { mois: string; label: string; volume: number }[] {
  const map = new Map<string, number>();
  for (const j of journees) {
    const ym = j.date.slice(0, 7);
    map.set(ym, (map.get(ym) ?? 0) + (j.volumeM3 ?? 0));
  }
  const out: { mois: string; label: string; volume: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      mois: ym,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      volume: Math.round((map.get(ym) ?? 0) * 100) / 100,
    });
  }
  return out;
}

/* ---------- Jeu de démonstration ---------- */
export async function amorcerDemoProduction(): Promise<void> {
  const count = await db.journees.count();
  if (count > 0) return;
  const chantiers = await db.chantiers.toArray();
  const actifs = chantiers.filter((c) => c.statut !== "a_faire");
  if (actifs.length === 0) return;

  const now = new Date();
  const demo: Journee[] = [];
  // ~12 journées sur les 20 derniers jours
  const jours = [1, 2, 3, 4, 6, 7, 8, 9, 11, 13, 15, 18];
  for (const back of jours) {
    const d = new Date(now);
    d.setDate(now.getDate() - back);
    if (d.getDay() === 0) continue; // pas le dimanche
    const c = actifs[back % actifs.length];
    const vol = Math.round((28 + Math.random() * 30) * 10) / 10;
    const pins = Math.round(vol * (5 + Math.random() * 2));
    const base = new Date().toISOString();
    demo.push({
      id: newId(),
      chantierId: c.id,
      date: d.toISOString().slice(0, 10),
      volumeM3: vol,
      nbPins: pins,
      nbAutres: Math.round(Math.random() * 12),
      heureDebut: "08:00",
      heureFin: Math.random() > 0.5 ? "17:00" : "16:30",
      pauseMin: 45,
      hMachine: Math.round((5 + Math.random() * 2) * 10) / 10,
      hDeplacement: Math.round((0.5 + Math.random()) * 10) / 10,
      notes: "",
      createdAt: base,
      updatedAt: base,
      syncStatus: "local",
    });
  }
  await db.journees.bulkAdd(demo);
}
