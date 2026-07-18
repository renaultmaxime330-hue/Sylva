"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { monEquipe } from "./client/teams";
import { emettre, surEvenement } from "./client/socket";
import type { Role } from "./profil";

/* Temps réel entre membres d'une équipe, via Socket.io (salle team:<id>,
   jointe côté serveur d'après le jeton — le client n'a même pas besoin de
   connaître son teamId). Le serveur connaît déjà l'identité de l'émetteur
   (JWT du handshake) : le client n'envoie que sa position brute, jamais son
   propre userId/nom/rôle — l'usurpation d'identité est structurellement
   impossible, contrairement à l'ancien canal Supabase qui faisait confiance
   au payload envoyé par le client.

   Rien n'est enregistré en base : tout disparaît à la déconnexion (mémoire
   du process serveur uniquement, voir lib/server/realtime/io.ts). */

export interface Coequipier {
  userId: string;
  nom: string;
  role: Role;
  lat: number | null;
  lng: number | null;
  precisionM: number | null;
  maj: string; // ISO — vide tant qu'aucune position n'est reçue
}

interface PositionEmise {
  lat: number;
  lng: number;
  precisionM: number | null;
}
interface PositionRecue {
  userId: string;
  nom: string;
  role: Role;
  lat: number;
  lng: number;
  precisionM: number | null;
  at: string;
}
interface MembrePresence { userId: string; nom: string; role: Role }

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

  const watchRef = useRef<number | null>(null);
  const membresRef = useRef(new Map<string, { nom: string; role: Role }>());
  const posRef = useRef(new Map<string, { lat: number; lng: number; precisionM: number | null; maj: string }>());
  const maPosRef = useRef<PositionEmise | null>(null);
  const dernierEnvoiRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<Array<() => void>>([]);

  /** Recompose la liste affichée : qui est en ligne + sa dernière position connue. */
  const recomposer = useCallback(() => {
    const out: Coequipier[] = [];
    for (const [id, m] of membresRef.current) {
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
    for (const off of listenersRef.current) off();
    listenersRef.current = [];
    membresRef.current.clear();
    posRef.current.clear();
    maPosRef.current = null;
    setEquipiers([]);
    setActif(false);
  }, []);

  /** Diffuse ma position, au plus une fois toutes les MIN_ENVOI_MS (la dernière part toujours). */
  const diffuser = useCallback((p: PositionEmise) => {
    maPosRef.current = p;
    const envoi = () => {
      dernierEnvoiRef.current = Date.now();
      if (maPosRef.current) emettre("pos:update", maPosRef.current);
    };
    const ecoule = Date.now() - dernierEnvoiRef.current;
    if (ecoule >= MIN_ENVOI_MS) envoi();
    else if (!timerRef.current) {
      timerRef.current = setTimeout(() => { timerRef.current = null; envoi(); }, MIN_ENVOI_MS - ecoule);
    }
  }, []);

  const demarrer = useCallback(() => {
    setErreur("");
    if (!("geolocation" in navigator)) { setErreur("Géolocalisation indisponible sur cet appareil."); return; }

    listenersRef.current.push(
      surEvenement<MembrePresence[]>("presence:snapshot", (liste) => {
        membresRef.current.clear();
        for (const m of liste) membresRef.current.set(m.userId, { nom: m.nom, role: m.role });
        recomposer();
      }),
      // Un nouveau arrive : je lui renvoie ma position, sinon il ne me verrait qu'au prochain point GPS.
      surEvenement<MembrePresence>("presence:join", (m) => {
        membresRef.current.set(m.userId, { nom: m.nom, role: m.role });
        recomposer();
        if (maPosRef.current) emettre("pos:update", maPosRef.current);
      }),
      surEvenement<{ userId: string }>("presence:leave", ({ userId }) => {
        membresRef.current.delete(userId);
        posRef.current.delete(userId);
        recomposer();
      }),
      surEvenement<PositionRecue>("pos:update", (p) => {
        if (!membresRef.current.has(p.userId)) membresRef.current.set(p.userId, { nom: p.nom, role: p.role });
        posRef.current.set(p.userId, { lat: p.lat, lng: p.lng, precisionM: p.precisionM, maj: p.at });
        recomposer();
      }),
    );

    setActif(true);
    try { localStorage.setItem(CLE_PARTAGE, "1"); } catch { /* ignore */ }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setErreur("");
        diffuser({
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          precisionM: Math.round(pos.coords.accuracy),
        });
      },
      (e) => setErreur(
        e.code === e.PERMISSION_DENIED
          ? "Autorise la localisation pour partager ta position."
          : "Position indisponible pour l'instant."
      ),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }, [diffuser, recomposer]);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const eq = await monEquipe().catch(() => null);
      if (!vivant) return;
      setDansEquipe(!!eq);
      if (eq && partageMemorise()) demarrer();
    })();
    return () => { vivant = false; arreter(); };
  }, [demarrer, arreter]);

  const basculer = useCallback(() => {
    if (actif) {
      try { localStorage.removeItem(CLE_PARTAGE); } catch { /* ignore */ }
      arreter();
    } else {
      demarrer();
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
