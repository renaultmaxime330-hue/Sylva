"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { getProfil, type Role } from "./profil";
import { monEquipe } from "./team";

/* Temps réel entre membres d'une équipe, sur le canal `equipe:<id>` :
   — la PRÉSENCE dit qui est en ligne (envoyée une seule fois, statique) ;
   — les positions passent par BROADCAST, fait pour les messages fréquents.
   La présence n'est pas adaptée aux mises à jour répétées : chaque track ajoute
   une entrée à l'état sans retirer l'ancienne, et les envois rapprochés se
   perdent — la position resterait figée.

   Rien n'est enregistré en base : tout disparaît à la fermeture de l'app. */

export interface Coequipier {
  userId: string;
  nom: string;
  role: Role;
  lat: number | null;
  lng: number | null;
  precisionM: number | null;
  maj: string; // ISO — vide tant qu'aucune position n'est reçue
}

interface Position {
  userId: string;
  lat: number;
  lng: number;
  precisionM: number | null;
  maj: string;
}

const CLE_PARTAGE = "sylva-partage-position";
const MIN_ENVOI_MS = 2000; // au plus une position toutes les 2 s

function partageMemorise(): boolean {
  try { return localStorage.getItem(CLE_PARTAGE) === "1"; } catch { return false; }
}

export interface EtatPresence {
  dansEquipe: boolean;
  actif: boolean;
  equipiers: Coequipier[];
  erreur: string;
  basculer: () => void;
}

export function usePresence(): EtatPresence {
  const [dansEquipe, setDansEquipe] = useState(false);
  const [actif, setActif] = useState(false);
  const [equipiers, setEquipiers] = useState<Coequipier[]>([]);
  const [erreur, setErreur] = useState("");

  const chanRef = useRef<RealtimeChannel | null>(null);
  const watchRef = useRef<number | null>(null);
  const monIdRef = useRef("");
  const membresRef = useRef(new Map<string, { nom: string; role: Role }>());
  const posRef = useRef(new Map<string, Position>());
  const maPosRef = useRef<Position | null>(null);
  const dernierEnvoiRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Recompose la liste affichée : qui est en ligne + sa dernière position connue. */
  const recomposer = useCallback(() => {
    const out: Coequipier[] = [];
    for (const [id, m] of membresRef.current) {
      if (id === monIdRef.current) continue;
      const p = posRef.current.get(id);
      out.push({
        userId: id, nom: m.nom, role: m.role,
        lat: p?.lat ?? null, lng: p?.lng ?? null,
        precisionM: p?.precisionM ?? null, maj: p?.maj ?? "",
      });
    }
    out.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    setEquipiers(out);
  }, []);

  const arreter = useCallback(() => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const ch = chanRef.current;
    chanRef.current = null;
    if (ch) { void ch.untrack().catch(() => {}); void getSupabase()?.removeChannel(ch); }
    membresRef.current.clear();
    posRef.current.clear();
    maPosRef.current = null;
    setEquipiers([]);
    setActif(false);
  }, []);

  /** Diffuse ma position, au plus une fois toutes les MIN_ENVOI_MS (la dernière part toujours). */
  const diffuser = useCallback((p: Position) => {
    maPosRef.current = p;
    const envoi = () => {
      dernierEnvoiRef.current = Date.now();
      if (maPosRef.current) void chanRef.current?.send({ type: "broadcast", event: "pos", payload: maPosRef.current });
    };
    const ecoule = Date.now() - dernierEnvoiRef.current;
    if (ecoule >= MIN_ENVOI_MS) envoi();
    else if (!timerRef.current) {
      timerRef.current = setTimeout(() => { timerRef.current = null; envoi(); }, MIN_ENVOI_MS - ecoule);
    }
  }, []);

  const demarrer = useCallback(async () => {
    setErreur("");
    const sb = getSupabase();
    if (!sb || chanRef.current) return;

    const eq = await monEquipe().catch(() => null);
    if (!eq) { setErreur("Rejoins d'abord une équipe dans Réglages."); return; }
    const profil = await getProfil();
    const { data: { user } } = await sb.auth.getUser();
    if (!user || !profil) { setErreur("Connecte-toi d'abord dans Réglages."); return; }
    if (!("geolocation" in navigator)) { setErreur("Géolocalisation indisponible sur cet appareil."); return; }
    monIdRef.current = user.id;

    const ch = sb.channel(`equipe:${eq.equipe.id}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    chanRef.current = ch;

    // Qui est en ligne
    ch.on("presence", { event: "sync" }, () => {
      membresRef.current.clear();
      for (const [cle, liste] of Object.entries(ch.presenceState<{ nom: string; role: Role }>())) {
        const p = liste[liste.length - 1];
        if (p) membresRef.current.set(cle, { nom: p.nom, role: p.role });
      }
      for (const id of posRef.current.keys()) if (!membresRef.current.has(id)) posRef.current.delete(id);
      recomposer();
    });

    // Un nouveau arrive : je lui renvoie ma position, sinon il ne me verrait qu'au prochain point GPS
    ch.on("presence", { event: "join" }, ({ key }) => {
      if (key !== monIdRef.current && maPosRef.current) {
        void ch.send({ type: "broadcast", event: "pos", payload: maPosRef.current });
      }
    });

    // Positions des autres
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as Position;
      if (!p?.userId || p.userId === monIdRef.current) return;
      posRef.current.set(p.userId, p);
      recomposer();
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.track({ userId: user.id, nom: profil.nom, role: profil.role }); // statique : une seule fois
        setActif(true);
        try { localStorage.setItem(CLE_PARTAGE, "1"); } catch { /* ignore */ }
        watchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            setErreur("");
            diffuser({
              userId: user.id,
              lat: pos.coords.latitude, lng: pos.coords.longitude,
              precisionM: Math.round(pos.coords.accuracy),
              maj: new Date().toISOString(),
            });
          },
          (e) => setErreur(
            e.code === e.PERMISSION_DENIED
              ? "Autorise la localisation pour partager ta position."
              : "Position indisponible pour l'instant."
          ),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
        );
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setErreur("Connexion temps réel impossible — vérifie le réseau.");
      }
    });
  }, [diffuser, recomposer]);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const eq = await monEquipe().catch(() => null);
      if (!vivant) return;
      setDansEquipe(!!eq);
      if (eq && partageMemorise()) void demarrer();
    })();
    return () => { vivant = false; arreter(); };
  }, [demarrer, arreter]);

  const basculer = useCallback(() => {
    if (actif) {
      try { localStorage.removeItem(CLE_PARTAGE); } catch { /* ignore */ }
      arreter();
    } else {
      void demarrer();
    }
  }, [actif, arreter, demarrer]);

  return { dansEquipe, actif, equipiers, erreur, basculer };
}

/** « il y a 2 min » — fraîcheur d'une position. */
export function depuis(iso: string): string {
  if (!iso) return "position en attente";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 15) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.round(m / 60)} h`;
}
