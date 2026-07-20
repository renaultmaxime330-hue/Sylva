"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useChantiers } from "@/lib/queries/chantiers";
import { useJournees } from "@/lib/queries/journees";
import { creerJournee, modifierJournee } from "@/lib/production";
import { IcTruck, IcPlus, IcMinus, IcChevron } from "@/lib/icons";

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);

interface Valeurs { pins: number; autres: number }

/** Overlay flottant (PC, tablette, téléphone) pour compter les tours de
    porteur au fil de la journée, par essence, sans passer par le formulaire
    complet. Un seul chantier "en cours" → pas d'ambiguïté sur où compter ;
    sinon l'overlay ne s'affiche pas (ambigu, autant passer par la saisie
    normale). Le pas (1 ou ½ tour) est un réglage partagé par les deux
    catégories plutôt que 4 boutons par ligne — plus rapide à l'usage. */
export default function TourPorteurOverlay() {
  const { utilisateur } = useAuth();
  const { data: chantiers } = useChantiers();
  const { data: journees } = useJournees();
  const [ouvert, setOuvert] = useState(false);
  const [demiTour, setDemiTour] = useState(false);
  const [busy, setBusy] = useState(false);

  const enCours = useMemo(() => (chantiers ?? []).filter((c) => c.statut === "en_cours"), [chantiers]);
  const chantier = enCours.length === 1 ? enCours[0] : null;
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

  if (utilisateur?.role !== "debardeur" || !chantier) return null;

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
    <div className="tours-overlay" data-ouvert={ouvert}>
      {ouvert && (
        <div className="tours-panel">
          <div className="tours-titre muted">
            <IcTruck /> Tours de porteur — {chantier.nom}
          </div>

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
        </div>
      )}
      <button className="tours-fab" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}>
        <IcTruck /> <b>{total}</b>
        <span className="tours-fab-chev" data-ouvert={ouvert}><IcChevron /></span>
      </button>
    </div>
  );
}
