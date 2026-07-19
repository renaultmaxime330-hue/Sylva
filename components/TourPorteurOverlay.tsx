"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useChantiers } from "@/lib/queries/chantiers";
import { useJournees } from "@/lib/queries/journees";
import { creerJournee, modifierJournee } from "@/lib/production";
import { IcTruck, IcPlus, IcMinus, IcChevron } from "@/lib/icons";

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);

/** Overlay flottant (mobile/tablette) pour compter les tours de porteur au fil
    de la journée, sans passer par le formulaire de saisie complet. Un seul
    chantier "en cours" → pas d'ambiguïté sur où compter ; sinon, l'overlay
    ne s'affiche pas (ambigu, autant passer par la saisie normale). */
export default function TourPorteurOverlay() {
  const { utilisateur } = useAuth();
  const { data: chantiers } = useChantiers();
  const { data: journees } = useJournees();
  const [ouvert, setOuvert] = useState(false);
  const [busy, setBusy] = useState(false);

  const enCours = useMemo(() => (chantiers ?? []).filter((c) => c.statut === "en_cours"), [chantiers]);
  const chantier = enCours.length === 1 ? enCours[0] : null;
  const date = AUJOURDHUI();
  const journeeDuJour = useMemo(
    () => (journees ?? []).find((j) => j.chantierId === chantier?.id && j.date === date) ?? null,
    [journees, chantier, date]
  );
  const tours = journeeDuJour?.nbToursPorteur ?? 0;

  if (utilisateur?.role !== "debardeur" || !chantier) return null;

  async function ajuster(delta: number) {
    const cible = Math.max(0, Math.round((tours + delta) * 2) / 2);
    if (cible === tours) return;
    setBusy(true);
    try {
      if (journeeDuJour) await modifierJournee(journeeDuJour.id, { nbToursPorteur: cible });
      else await creerJournee({ chantierId: chantier!.id, date, nbToursPorteur: cible, notes: "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tours-overlay" data-ouvert={ouvert}>
      {ouvert && (
        <div className="tours-panel">
          <div className="tours-titre muted">
            <IcTruck /> Tours de porteur — {chantier.nom}
          </div>
          <div className="tours-rangee">
            <button className="tours-btn lg" disabled={busy || tours <= 0} onClick={() => ajuster(-1)} aria-label="Retirer un tour">
              <IcMinus />
            </button>
            <span className="tours-val">{tours}</span>
            <button className="tours-btn lg" disabled={busy} onClick={() => ajuster(1)} aria-label="Ajouter un tour">
              <IcPlus />
            </button>
          </div>
          <div className="tours-rangee sm">
            <button className="tours-btn sm" disabled={busy || tours <= 0} onClick={() => ajuster(-0.5)}>− ½</button>
            <button className="tours-btn sm" disabled={busy} onClick={() => ajuster(0.5)}>+ ½</button>
          </div>
        </div>
      )}
      <button className="tours-fab" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}>
        <IcTruck /> <b>{tours}</b>
        <span className="tours-fab-chev" data-ouvert={ouvert}><IcChevron /></span>
      </button>
    </div>
  );
}
