"use client";

import { useState } from "react";
import { useTourCategories } from "@/lib/queries/tourCategories";
import {
  creerTourCategorie, modifierTourCategorie, supprimerTourCategorie, champsVidesTourCategorie,
} from "@/lib/tourCategories";
import type { TourCategorie } from "@/lib/db";
import { IcPlus, IcTrash, IcCheck, IcLogs } from "@/lib/icons";

/** Gestion des catégories de qualité (Canter, Caisse, Trituration…) pour les
    tours de porteur : renommage, capacité (stères/tour) et coefficient de
    stérage édités en place, ajout libre, archivage plutôt que suppression
    tant qu'une catégorie a des tours enregistrés (imposé côté serveur). */
export default function TourCategoriesManager() {
  const { data: categories } = useTourCategories();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  if (!categories) return <div className="muted" style={{ padding: 20 }}>Chargement…</div>;

  const actives = categories.filter((c) => c.actif).sort((a, b) => a.ordre - b.ordre);
  const archivees = categories.filter((c) => !c.actif).sort((a, b) => a.ordre - b.ordre);
  const prochainOrdre = categories.reduce((m, c) => Math.max(m, c.ordre), -1) + 1;

  return (
    <div className="card pad">
      <h3 className="sec-title"><span className="sec-ic wood"><IcLogs /></span> Catégories de bois</h3>
      <p className="muted" style={{ fontSize: 14, marginTop: -8, marginBottom: 16 }}>
        Une catégorie par qualité de tri (Canter, Caisse, Trituration…). Renseigne la capacité de ton
        porteur pour chacune afin d&apos;activer le calcul automatique du volume.
      </p>

      <div className="tourcat-list">
        {actives.map((c) => <CategorieRow key={c.id} c={c} />)}
        {archivees.length > 0 && (
          <>
            <div className="tourcat-sep">Archivées</div>
            {archivees.map((c) => <CategorieRow key={c.id} c={c} />)}
          </>
        )}
      </div>

      {ajoutOuvert ? (
        <AjoutCategorie ordre={prochainOrdre} onDone={() => setAjoutOuvert(false)} />
      ) : (
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => setAjoutOuvert(true)}>
          <IcPlus /> Ajouter une catégorie
        </button>
      )}
    </div>
  );
}

function CategorieRow({ c }: { c: TourCategorie }) {
  const [nom, setNom] = useState(c.nom);
  const [capacite, setCapacite] = useState(c.capaciteTourSteres != null ? String(c.capaciteTourSteres) : "");
  const [coeff, setCoeff] = useState(String(c.coefficientSterage));
  const [busy, setBusy] = useState(false);

  async function sauverNom() {
    const v = nom.trim();
    if (!v || v === c.nom) { setNom(c.nom); return; }
    await modifierTourCategorie(c.id, { nom: v });
  }
  async function sauverCapacite() {
    const v = capacite === "" ? undefined : Number(capacite);
    if (v === c.capaciteTourSteres) return;
    await modifierTourCategorie(c.id, { capaciteTourSteres: v ?? null });
  }
  async function sauverCoeff() {
    const v = Number(coeff);
    if (!Number.isFinite(v) || v === c.coefficientSterage) { setCoeff(String(c.coefficientSterage)); return; }
    await modifierTourCategorie(c.id, { coefficientSterage: v });
  }
  async function toggleActif() {
    setBusy(true);
    try { await modifierTourCategorie(c.id, { actif: !c.actif }); } finally { setBusy(false); }
  }
  async function supprimer() {
    if (!confirm(`Supprimer la catégorie « ${c.nom} » ?`)) return;
    setBusy(true);
    try {
      await supprimerTourCategorie(c.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tourcat-row" data-archivee={!c.actif}>
      <input
        type="color" className="tourcat-swatch" value={c.couleur} title="Couleur"
        onChange={(e) => void modifierTourCategorie(c.id, { couleur: e.target.value })}
      />
      <input
        className="input tourcat-nom" value={nom} disabled={busy}
        onChange={(e) => setNom(e.target.value)} onBlur={sauverNom}
        aria-label={`Nom de la catégorie ${c.nom}`}
      />
      <div className="tourcat-field">
        <label>Capacité</label>
        <div className="tourcat-field-input">
          <input
            className="input" type="number" min="0" step="0.5" inputMode="decimal" placeholder="à configurer"
            value={capacite} disabled={busy}
            onChange={(e) => setCapacite(e.target.value)} onBlur={sauverCapacite}
          />
          <small>stères/tour</small>
        </div>
      </div>
      <div className="tourcat-field">
        <label>Foisonnement</label>
        <div className="tourcat-field-input">
          <input
            className="input" type="number" min="0" max="3" step="0.05" inputMode="decimal"
            value={coeff} disabled={busy}
            onChange={(e) => setCoeff(e.target.value)} onBlur={sauverCoeff}
          />
          <small>m³ plein/stère</small>
        </div>
      </div>
      <div className="tourcat-actions">
        <button type="button" className="chip-btn" data-on={c.actif} disabled={busy} onClick={toggleActif}>
          {c.actif ? <><IcCheck /> Active</> : "Archivée"}
        </button>
        <button type="button" className="iconbtn" aria-label={`Supprimer ${c.nom}`} disabled={busy} onClick={supprimer}>
          <IcTrash />
        </button>
      </div>
    </div>
  );
}

function AjoutCategorie({ ordre, onDone }: { ordre: number; onDone: () => void }) {
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = nom.trim();
    if (!v) return;
    setSaving(true);
    try {
      await creerTourCategorie({ ...champsVidesTourCategorie(ordre), nom: v });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="tourcat-add" onSubmit={submit}>
      <input
        className="input" placeholder="Nom de la nouvelle catégorie" autoFocus value={nom}
        onChange={(e) => setNom(e.target.value)}
      />
      <button type="submit" className="btn primary" disabled={saving || !nom.trim()}>
        <IcCheck /> Ajouter
      </button>
      <button type="button" className="btn" onClick={onDone}>Annuler</button>
    </form>
  );
}
