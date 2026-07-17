import type { Journee } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

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

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["journees"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["journees", id] });
}

export async function creerJournee(data: JourneeInput): Promise<string> {
  const r = await apiFetch("/api/journees", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible d'enregistrer la journée.");
  const { journee } = await r.json();
  invalider();
  return journee.id as string;
}

export async function modifierJournee(id: string, data: Partial<JourneeInput>): Promise<void> {
  const r = await apiFetch(`/api/journees/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier la journée.");
  invalider(id);
}

export async function supprimerJournee(id: string): Promise<void> {
  const r = await apiFetch(`/api/journees/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer la journée.");
  invalider(id);
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

export type Periode = "jour" | "semaine" | "mois" | "annee";

/** Une date (YYYY-MM-DD) tombe-t-elle dans la période courante ? */
export function dansPeriode(dateISO: string, periode: Periode): boolean {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (periode === "jour") return dateISO === today;
  if (periode === "mois") return dateISO.slice(0, 7) === today.slice(0, 7);
  if (periode === "annee") return dateISO.slice(0, 4) === today.slice(0, 4);
  const d = new Date(dateISO + "T00:00:00");
  return d >= startOfWeek(now) && d <= now;
}

export function filtrePeriode(journees: Journee[], periode: Periode): Journee[] {
  return journees.filter((j) => dansPeriode(j.date, periode));
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
