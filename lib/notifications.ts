import type { NotifType } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

/* Centre d'alertes. Deux sources :
   — les alertes DÉDUITES des données (entretien, stock, fin de chantier) —
     moteur de recalcul reporté Phase 8 (voir rafraichirAlertes ci-dessous) ;
   — les événements REÇUS de l'équipe en temps réel (modif de la carte), voir lib/canal.ts. */

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider() {
  void queryClient.invalidateQueries({ queryKey: ["notifs"] });
}

/** La `cle` évite les doublons (dédoublonnage fait côté serveur, index unique). */
export async function creerNotif(
  type: NotifType, cle: string, titre: string, detail: string, href?: string
): Promise<void> {
  const r = await apiFetch("/api/notifs", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, cle, titre, detail, href }),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer l'alerte.");
  invalider();
}

/** Recalcule les alertes déduites des données (entretien/stock/chantier terminé).
    TODO Phase 8 : moteur serveur — ces données vivent maintenant en Postgres,
    pas en IndexedDB, donc ce recalcul est neutralisé le temps de reporter la
    logique côté serveur (voir plan de migration). */
export async function rafraichirAlertes(): Promise<void> {
  // no-op — TODO Phase 8
}

export async function marquerLu(id: string): Promise<void> {
  const r = await apiFetch(`/api/notifs/${id}`, { method: "PATCH" });
  if (!r.ok) await lireErreur(r, "Impossible de marquer l'alerte comme lue.");
  invalider();
}

export async function marquerToutLu(): Promise<void> {
  const r = await apiFetch("/api/notifs", { method: "PATCH" });
  if (!r.ok) await lireErreur(r, "Impossible de marquer les alertes comme lues.");
  invalider();
}

export async function supprimerNotif(id: string): Promise<void> {
  const r = await apiFetch(`/api/notifs/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer l'alerte.");
  invalider();
}

export async function viderNotifs(): Promise<void> {
  const r = await apiFetch("/api/notifs", { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible d'effacer les alertes.");
  invalider();
}

export function notifInfo(t: NotifType): { label: string; couleur: string } {
  switch (t) {
    case "entretien": return { label: "Entretien", couleur: "var(--danger)" };
    case "stock": return { label: "Stock", couleur: "var(--wood)" };
    case "chantier": return { label: "Chantier", couleur: "var(--accent)" };
    case "carte": return { label: "Carte", couleur: "#2563EB" };
  }
}

export function quand(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
