"use client";

import { useState } from "react";
import { useDossiers } from "@/lib/queries/dossiers";
import { creerDossier, modifierDossier, supprimerDossier, champsVidesDossier } from "@/lib/dossiers";
import type { ChantierDossier } from "@/lib/db";
import { IcPlus, IcTrash, IcCheck } from "@/lib/icons";

/** Gestion des dossiers de chantiers (nom, couleur) — renommage et couleur
    édités en place, ajout libre, suppression sans confirmation bloquante :
    un chantier ne perd que son étiquette, jamais ses données. */
export default function DossiersManager({ onDone }: { onDone?: () => void }) {
  const { data: dossiers } = useDossiers();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  if (!dossiers) return <div className="muted" style={{ padding: 12 }}>Chargement…</div>;

  const triees = [...dossiers].sort((a, b) => a.ordre - b.ordre);
  const prochainOrdre = dossiers.reduce((m, d) => Math.max(m, d.ordre), -1) + 1;

  return (
    <div className="card pad">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 className="sec-title" style={{ marginBottom: 0, flex: 1 }}>Dossiers de chantiers</h3>
        {onDone && (
          <button type="button" className="iconbtn" aria-label="Fermer" onClick={onDone}>
            <span style={{ display: "flex", transform: "rotate(45deg)" }}><IcPlus /></span>
          </button>
        )}
      </div>

      {triees.length === 0 && !ajoutOuvert && (
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>Aucun dossier pour l&apos;instant.</p>
      )}

      <div className="dossier-list">
        {triees.map((d) => <DossierRow key={d.id} d={d} />)}
      </div>

      {ajoutOuvert ? (
        <AjoutDossier ordre={prochainOrdre} onDone={() => setAjoutOuvert(false)} />
      ) : (
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => setAjoutOuvert(true)}>
          <IcPlus /> Nouveau dossier
        </button>
      )}
    </div>
  );
}

function DossierRow({ d }: { d: ChantierDossier }) {
  const [nom, setNom] = useState(d.nom);
  const [busy, setBusy] = useState(false);

  async function sauverNom() {
    const v = nom.trim();
    if (!v || v === d.nom) { setNom(d.nom); return; }
    await modifierDossier(d.id, { nom: v });
  }
  async function supprimer() {
    if (!confirm(`Supprimer le dossier « ${d.nom} » ?\nLes chantiers qu'il contient ne sont pas supprimés, juste détachés du dossier.`)) return;
    setBusy(true);
    try { await supprimerDossier(d.id); } finally { setBusy(false); }
  }

  return (
    <div className="dossier-row">
      <input
        type="color" className="tourcat-swatch" value={d.couleur} title="Couleur"
        onChange={(e) => void modifierDossier(d.id, { couleur: e.target.value })}
      />
      <input
        className="input dossier-nom" value={nom} disabled={busy}
        onChange={(e) => setNom(e.target.value)} onBlur={sauverNom}
        aria-label={`Nom du dossier ${d.nom}`}
      />
      <button type="button" className="iconbtn" aria-label={`Supprimer ${d.nom}`} disabled={busy} onClick={supprimer}>
        <IcTrash />
      </button>
    </div>
  );
}

function AjoutDossier({ ordre, onDone }: { ordre: number; onDone: () => void }) {
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = nom.trim();
    if (!v) return;
    setSaving(true);
    try {
      await creerDossier({ ...champsVidesDossier(ordre), nom: v });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="tourcat-add" onSubmit={submit}>
      <input
        className="input" placeholder="Nom du dossier" autoFocus value={nom}
        onChange={(e) => setNom(e.target.value)}
      />
      <button type="submit" className="btn primary" disabled={saving || !nom.trim()}>
        <IcCheck /> Ajouter
      </button>
      <button type="button" className="btn" onClick={onDone}>Annuler</button>
    </form>
  );
}
