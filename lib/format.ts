import type { Statut } from "./db";
import { STATUTS } from "./db";

/* Formatage — français, unités métier. */

export function statutInfo(s: Statut) {
  return STATUTS.find((x) => x.value === s) ?? STATUTS[0];
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatSurface(ha?: number): string {
  if (ha == null || isNaN(ha)) return "—";
  return ha.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) + " ha";
}

export function formatGPS(lat?: number, lng?: number): string {
  if (lat == null || lng == null) return "—";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function formatLongueur(m?: number): string {
  if (m == null || isNaN(m)) return "—";
  if (m >= 1000) {
    const km = (m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return `${km} km (${Math.round(m).toLocaleString("fr-FR")} m)`;
  }
  return `${Math.round(m).toLocaleString("fr-FR")} m`;
}

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  if (octets < 1024 * 1024 * 1024) return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
  return `${(octets / 1024 / 1024 / 1024).toFixed(1)} Go`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Heures décimales → "6 h 45" / "6 h" / "45 min". */
export function formatHeures(h?: number): string {
  if (h == null || isNaN(h)) return "—";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm} min`;
  return mm === 0 ? `${hh} h` : `${hh} h ${String(mm).padStart(2, "0")}`;
}

export function formatM3(n?: number): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " m³";
}

export function formatDateCourte(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}
