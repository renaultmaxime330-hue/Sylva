"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { getProfil, type Role } from "./profil";
import { monEquipe } from "./team";
import type { GeomType } from "./db";

/* Canal d'équipe pour les MODIFS DE LA CARTE : `equipe:<id>:carte`.
   Séparé du canal de présence/positions (`equipe:<id>`) à dessein : les
   notifications doivent arriver même quand le partage de position est coupé.
   Deux topics sur la même connexion WebSocket, ça ne coûte rien. */

export interface EvenementCarte {
  id: string;           // identifiant de l'événement (dédoublonnage à la réception)
  auteurId: string;
  auteurNom: string;
  role: Role;
  action: "ajout" | "suppression" | "renommage";
  typeGeom: GeomType;
  nomGeom: string;
  chantierId: string;
  chantierNom: string;
  at: string;
}

let canal: RealtimeChannel | null = null;
let connexion: Promise<RealtimeChannel | null> | null = null;
let monId = "";
const ecouteurs = new Set<(e: EvenementCarte) => void>();

async function ouvrir(): Promise<RealtimeChannel | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const eq = await monEquipe().catch(() => null);
  if (!eq) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  monId = user.id;

  const ch = sb.channel(`equipe:${eq.equipe.id}:carte`, { config: { broadcast: { self: false } } });
  ch.on("broadcast", { event: "carte" }, ({ payload }) => {
    const e = payload as EvenementCarte;
    if (!e?.id || e.auteurId === monId) return;
    for (const cb of ecouteurs) cb(e);
  });
  await new Promise<void>((res) => ch.subscribe((s) => { if (s === "SUBSCRIBED") res(); }));
  canal = ch;
  return ch;
}

function canalEquipe(): Promise<RealtimeChannel | null> {
  if (canal) return Promise.resolve(canal);
  if (!connexion) connexion = ouvrir().catch(() => null);
  return connexion;
}

/** Écoute les modifs de carte des coéquipiers. Retourne la fonction de désinscription. */
export function surModifCarte(cb: (e: EvenementCarte) => void): () => void {
  ecouteurs.add(cb);
  void canalEquipe();
  return () => { ecouteurs.delete(cb); };
}

/** Prévient l'équipe qu'on vient de toucher à la carte. Silencieux si hors équipe. */
export async function annoncerModifCarte(
  e: Pick<EvenementCarte, "action" | "typeGeom" | "nomGeom" | "chantierId" | "chantierNom">
): Promise<void> {
  const ch = await canalEquipe();
  if (!ch) return;
  const profil = await getProfil();
  if (!profil) return;
  const sb = getSupabase();
  const { data: { user } } = await sb!.auth.getUser();
  if (!user) return;
  await ch.send({
    type: "broadcast", event: "carte",
    payload: {
      ...e,
      id: crypto.randomUUID(),
      auteurId: user.id, auteurNom: profil.nom, role: profil.role,
      at: new Date().toISOString(),
    } satisfies EvenementCarte,
  });
}

/** À la déconnexion / au changement d'équipe. */
export function fermerCanalEquipe(): void {
  if (canal) { void getSupabase()?.removeChannel(canal); canal = null; }
  connexion = null;
  monId = "";
}
