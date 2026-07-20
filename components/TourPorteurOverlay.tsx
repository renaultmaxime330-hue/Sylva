"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useChantiers } from "@/lib/queries/chantiers";
import { useJournees } from "@/lib/queries/journees";
import { creerJournee, modifierJournee } from "@/lib/production";
import { IcTruck, IcPlus, IcMinus, IcChevron } from "@/lib/icons";

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);

interface Valeurs { pins: number; autres: number }
interface Pos { x: number; y: number }

const POS_KEY = "sylva-tours-pos";
const TAILLE_KEY = "sylva-tours-taille";
const DESACTIVE_KEY = "sylva-tours-desactive";
const TAILLE_MIN = 0.8;
const TAILLE_MAX = 1.6;
const MARGE = 8;
// Un tap au doigt bouge naturellement de quelques px entre pointerdown et
// pointerup (contact peau/écran) — avec un seuil trop serré (mesuré en plus
// image par image plutôt que sur le déplacement total), presque aucun tap
// tactile n'ouvrait le panneau : tout était pris pour un glissé.
const SEUIL_TAP = 10;

function lire<T>(cle: string, defaut: T): T {
  try {
    const v = localStorage.getItem(cle);
    return v == null ? defaut : (JSON.parse(v) as T);
  } catch { return defaut; }
}
function ecrire(cle: string, v: unknown) {
  try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* ignore */ }
}

function clamp(pos: Pos, largeur: number, hauteur: number): Pos {
  const maxX = Math.max(MARGE, window.innerWidth - largeur - MARGE);
  const maxY = Math.max(MARGE, window.innerHeight - hauteur - MARGE);
  return { x: Math.min(Math.max(pos.x, MARGE), maxX), y: Math.min(Math.max(pos.y, MARGE), maxY) };
}

/** Overlay flottant (PC, tablette, téléphone) pour compter les tours de
    porteur au fil de la journée, par essence, sans passer par le formulaire
    complet. Déplaçable (glisser la poignée), redimensionnable (poignée en
    coin), et désactivable via la croix — dans ce cas seule une petite pastille
    de réouverture reste visible, à la dernière position connue. */
export default function TourPorteurOverlay() {
  const { utilisateur } = useAuth();
  const { data: chantiers } = useChantiers();
  const { data: journees } = useJournees();
  const [ouvert, setOuvert] = useState(false);
  const [demiTour, setDemiTour] = useState(false);
  const [busy, setBusy] = useState(false);

  const [pos, setPos] = useState<Pos | null>(null);
  const [taille, setTaille] = useState(1);
  const [desactive, setDesactive] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ dx: number; dy: number; bougé: boolean; dernier: Pos; depart: Pos } | null>(null);
  const resizeRef = useRef<{ x0: number; y0: number; taille0: number; derniere: number } | null>(null);

  useEffect(() => {
    setPos(lire<Pos | null>(POS_KEY, null));
    setTaille(lire(TAILLE_KEY, 1));
    setDesactive(lire(DESACTIVE_KEY, false));
  }, []);

  const enCours = useMemo(() => (chantiers ?? []).filter((c) => c.statut === "en_cours"), [chantiers]);
  const [chantierId, setChantierId] = useState<string | null>(null);
  useEffect(() => {
    if (enCours.length === 0) { setChantierId(null); return; }
    setChantierId((id) => (id && enCours.some((c) => c.id === id) ? id : enCours[0].id));
  }, [enCours]);
  const chantier = enCours.find((c) => c.id === chantierId) ?? null;
  const date = AUJOURDHUI();
  const journeeDuJour = useMemo(
    () => (journees ?? []).find((j) => j.chantierId === chantier?.id && j.date === date) ?? null,
    [journees, chantier, date]
  );

  /* idRef/valeursRef sont la source de vérité SYNCHRONE (les refs, contrairement
     à useState, sont à jour immédiatement, y compris entre deux clics tapés
     dans le même tick — React ne les rend pas obsolètes le temps d'un
     re-render). colaRef sérialise les requêtes réseau : sans ça, deux clics
     rapprochés peuvent tous les deux voir "pas encore de journée créée" et
     créer deux lignes en double, ou repartir d'une valeur pas encore à jour
     et perdre un incrément. `local` ne sert qu'à déclencher le re-render. */
  const semenceRef = useRef<string | null>(null);
  const idRef = useRef<string | null>(null);
  const valeursRef = useRef<Valeurs>({ pins: 0, autres: 0 });
  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const [local, setLocal] = useState<Valeurs>({ pins: 0, autres: 0 });

  useEffect(() => {
    if (!chantier || journees === undefined) return;
    const cle = `${chantier.id}:${date}`;
    if (semenceRef.current === cle) return;
    semenceRef.current = cle;
    idRef.current = journeeDuJour?.id ?? null;
    valeursRef.current = { pins: journeeDuJour?.nbToursPins ?? 0, autres: journeeDuJour?.nbToursAutres ?? 0 };
    setLocal(valeursRef.current);
  }, [chantier, date, journees, journeeDuJour]);

  // Garde la pastille/le panneau dans l'écran si la fenêtre est redimensionnée.
  useEffect(() => {
    function onResize() {
      const el = rootRef.current;
      if (!pos || !el) return;
      setPos((p) => (p ? clamp(p, el.offsetWidth, el.offsetHeight) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  const estDebardeur = utilisateur?.role === "debardeur";

  /* Les callbacks pointermove/pointerup peuvent s'enchaîner dans le même tick
     (avant que React ne relise `pos`/`taille` à jour dans une nouvelle
     closure) : la valeur "actuelle" pour la persistance vient donc du ref
     (dernier/derniere), jamais de l'état React lu dans ces fonctions. */
  function demarrerDrag(e: React.PointerEvent) {
    const el = rootRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const base = pos ?? { x: rect.left, y: rect.top };
    dragRef.current = { dx: e.clientX - base.x, dy: e.clientY - base.y, bougé: false, dernier: base, depart: { x: e.clientX, y: e.clientY } };
  }
  function bougerDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    const el = rootRef.current;
    if (!d || !el) return;
    // Déplacement total depuis le point de départ du geste (pas image par
    // image) : seule mesure fiable pour distinguer un tap tactile d'un glissé.
    if (Math.abs(e.clientX - d.depart.x) > SEUIL_TAP || Math.abs(e.clientY - d.depart.y) > SEUIL_TAP) d.bougé = true;
    const next = { x: e.clientX - d.dx, y: e.clientY - d.dy };
    const clampé = clamp(next, el.offsetWidth, el.offsetHeight);
    d.dernier = clampé;
    setPos(clampé);
  }
  function finDrag() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.bougé) ecrire(POS_KEY, d.dernier);
    return d?.bougé ?? false;
  }
  /* iOS/Android peuvent couper la séquence de pointer en cours de route (menu
     contextuel d'appui long, geste système) : le navigateur envoie alors
     pointercancel au lieu de pointerup, et sans ce handler le glissé restait
     bloqué au milieu du geste — impossible de le reprendre avant un reload. */
  function annulerDrag() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.bougé) ecrire(POS_KEY, d.dernier);
  }

  function demarrerResize(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { x0: e.clientX, y0: e.clientY, taille0: taille, derniere: taille };
  }
  function bougerResize(e: React.PointerEvent) {
    const r = resizeRef.current;
    if (!r) return;
    const delta = ((e.clientX - r.x0) + (e.clientY - r.y0)) / 220;
    const next = Math.round((Math.min(TAILLE_MAX, Math.max(TAILLE_MIN, r.taille0 + delta))) * 20) / 20;
    r.derniere = next;
    setTaille(next);
  }
  function finResize() {
    const r = resizeRef.current;
    resizeRef.current = null;
    if (r) ecrire(TAILLE_KEY, r.derniere);
  }
  function annulerResize() {
    const r = resizeRef.current;
    resizeRef.current = null;
    if (r) ecrire(TAILLE_KEY, r.derniere);
  }

  function desactiver() {
    setDesactive(true);
    ecrire(DESACTIVE_KEY, true);
    setOuvert(false);
  }
  function reactiver() {
    setDesactive(false);
    ecrire(DESACTIVE_KEY, false);
  }

  if (!estDebardeur) return null;

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : {};

  /* Plutôt que de disparaître sans explication (impossible à diagnostiquer
     à distance sur un appareil qu'on ne peut pas inspecter), indique POURQUOI
     rien ne s'affiche — la cause la plus probable en usage réel : aucun
     chantier n'est marqué "en cours". */
  if (!chantier) {
    if (chantiers === undefined) return null; // chantiers pas encore chargés
    return (
      <Link href="/chantiers" className="tours-hint" style={style}>
        <IcTruck /> <span>Aucun chantier en cours</span>
      </Link>
    );
  }

  if (desactive) {
    return (
      <button
        ref={rootRef as React.RefObject<HTMLButtonElement>}
        className="tours-reopen"
        style={style}
        onClick={reactiver}
        aria-label="Réactiver le compteur de tours de porteur"
        title="Compteur de tours (désactivé)"
      >
        <IcTruck />
      </button>
    );
  }

  const total = Math.round((local.pins + local.autres) * 2) / 2;

  function ajuster(cat: "pins" | "autres", signe: 1 | -1) {
    const pas = demiTour ? 0.5 : 1;
    const actuel = valeursRef.current[cat];
    const cible = Math.max(0, Math.round((actuel + signe * pas) * 2) / 2);
    if (cible === actuel) return;
    valeursRef.current = { ...valeursRef.current, [cat]: cible };
    setLocal(valeursRef.current);

    const champ = cat === "pins" ? "nbToursPins" : "nbToursAutres";
    colaRef.current = colaRef.current
      .then(async () => {
        setBusy(true);
        try {
          if (idRef.current) {
            await modifierJournee(idRef.current, { [champ]: cible });
          } else {
            idRef.current = await creerJournee({ chantierId: chantier!.id, date, [champ]: cible, notes: "" });
          }
        } finally {
          setBusy(false);
        }
      })
      .catch(() => {});
  }

  return (
    <div
      ref={rootRef as React.RefObject<HTMLDivElement>}
      className="tours-overlay"
      data-ouvert={ouvert}
      style={{ ...style, transform: `scale(${taille})`, transformOrigin: pos ? "top left" : "bottom right" }}
    >
      <button className="tours-close" aria-label="Désactiver le compteur de tours" onClick={desactiver}>
        <span style={{ display: "flex", transform: "rotate(45deg)" }}><IcPlus /></span>
      </button>

      {ouvert && (
        <div className="tours-panel">
          <div
            className="tours-titre muted tours-drag"
            onPointerDown={demarrerDrag}
            onPointerMove={bougerDrag}
            onPointerUp={(e) => { if (finDrag()) e.preventDefault(); }}
            onPointerCancel={annulerDrag}
          >
            <IcTruck /> Tours de porteur
          </div>
          {enCours.length > 1 ? (
            <select
              className="select tours-chantier"
              value={chantier.id}
              onChange={(e) => setChantierId(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {enCours.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          ) : (
            <div className="tours-chantier-nom muted">{chantier.nom}</div>
          )}

          <div className="tours-cat">
            <span className="tours-cat-label">Pins</span>
            <button className="tours-btn sm" disabled={local.pins <= 0} onClick={() => ajuster("pins", -1)} aria-label="Retirer un tour de pins">
              <IcMinus />
            </button>
            <span className="tours-val sm">{local.pins}</span>
            <button className="tours-btn sm" onClick={() => ajuster("pins", 1)} aria-label="Ajouter un tour de pins">
              <IcPlus />
            </button>
          </div>
          <div className="tours-cat">
            <span className="tours-cat-label">Autres essences</span>
            <button className="tours-btn sm" disabled={local.autres <= 0} onClick={() => ajuster("autres", -1)} aria-label="Retirer un tour d'autres essences">
              <IcMinus />
            </button>
            <span className="tours-val sm">{local.autres}</span>
            <button className="tours-btn sm" onClick={() => ajuster("autres", 1)} aria-label="Ajouter un tour d'autres essences">
              <IcPlus />
            </button>
          </div>

          <label className="switch tours-switch">
            <input type="checkbox" checked={demiTour} onChange={(e) => setDemiTour(e.target.checked)} />
            <span>Par demi-tour</span>
          </label>

          <div
            className="tours-resize"
            onPointerDown={demarrerResize}
            onPointerMove={bougerResize}
            onPointerUp={finResize}
            onPointerCancel={annulerResize}
            aria-hidden="true"
            title="Glisser pour agrandir / rétrécir"
          />
        </div>
      )}
      <button
        className="tours-fab"
        onPointerDown={demarrerDrag}
        onPointerMove={bougerDrag}
        onPointerUp={(e) => { if (!finDrag()) setOuvert((v) => !v); else e.preventDefault(); }}
        onPointerCancel={annulerDrag}
        aria-expanded={ouvert}
      >
        <IcTruck /> <b>{total}</b>
        <span className="tours-fab-chev" data-ouvert={ouvert}><IcChevron /></span>
      </button>
    </div>
  );
}
