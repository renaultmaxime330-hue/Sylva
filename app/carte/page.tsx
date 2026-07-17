"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useChantiers } from "@/lib/queries/chantiers";
import { usePresence } from "@/lib/presence";
import MapChantier from "@/components/MapChantier";
import PresenceBar from "@/components/PresenceBar";
import { IcMap, IcPlus, IcChevron } from "@/lib/icons";

function CarteContent() {
  const searchParams = useSearchParams();
  const presence = usePresence();
  const { data: chantiers } = useChantiers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Présélection : ?c=<id> (depuis la fiche chantier) sinon 1er chantier
  useEffect(() => {
    if (!chantiers || chantiers.length === 0) return;
    const paramId = searchParams.get("c");
    if (paramId && chantiers.some((c) => c.id === paramId)) {
      setSelectedId(paramId);
    } else {
      setSelectedId((prev) => (prev && chantiers.some((c) => c.id === prev) ? prev : chantiers[0].id));
    }
  }, [chantiers, searchParams]);

  if (!chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  if (chantiers.length === 0) {
    return (
      <div className="stack-gap">
        <div className="page-head">
          <div className="titles">
            <p className="eyebrow">Carte</p>
            <h1>Cartographie</h1>
          </div>
        </div>
        <div className="card pad empty">
          <div className="ic"><IcMap /></div>
          <h3>Aucun chantier</h3>
          <p>Crée d'abord un chantier, puis reviens ici pour dessiner sa parcelle, ses pistes, ses places de dépôt et ses points.</p>
          <Link href="/chantiers/nouveau" className="btn primary big"><IcPlus /> Créer un chantier</Link>
        </div>
      </div>
    );
  }

  const selected = chantiers.find((c) => c.id === selectedId) ?? chantiers[0];

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Carte</p>
          <h1>Cartographie</h1>
          <p className="sub">Choisis un chantier, puis dessine sa parcelle, ses places de dépôt, ses pistes et ses points d&apos;intérêt. La fiche du chantier se met à jour automatiquement.</p>
        </div>
      </div>

      <div className="carte-picker">
        <label htmlFor="ch-select">Chantier</label>
        <select id="ch-select" className="select" value={selected.id} onChange={(e) => setSelectedId(e.target.value)}>
          {chantiers.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}{c.commune ? ` — ${c.commune}` : ""}</option>
          ))}
        </select>
        <Link href={`/chantiers/${selected.id}`} className="btn">Ouvrir la fiche <IcChevron /></Link>
      </div>

      <PresenceBar {...presence} />

      <MapChantier key={selected.id} chantier={selected} equipiers={presence.equipiers} />
    </div>
  );
}

export default function CartePage() {
  return (
    <Suspense fallback={<div className="muted" style={{ padding: 40 }}>Chargement…</div>}>
      <CarteContent />
    </Suspense>
  );
}
