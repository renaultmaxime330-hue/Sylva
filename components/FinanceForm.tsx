"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Finance } from "@/lib/db";
import { useChantiers } from "@/lib/queries/chantiers";
import { creerFinance, modifierFinance, champsVidesFinance, CAT_RECETTES, CAT_DEPENSES, type FinanceInput } from "@/lib/finances";
import { IcCheck, IcBack } from "@/lib/icons";

export default function FinanceForm({ initial }: { initial?: Finance }) {
  const router = useRouter();
  const editing = !!initial;
  const { data: chantiers } = useChantiers();
  const [f, setF] = useState<FinanceInput>(
    initial
      ? { chantierId: initial.chantierId, type: initial.type, categorie: initial.categorie, libelle: initial.libelle, montant: initial.montant, date: initial.date }
      : champsVidesFinance()
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FinanceInput>(k: K, v: FinanceInput[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.montant || f.montant <= 0) return;
    setSaving(true);
    try {
      if (editing && initial) { await modifierFinance(initial.id, f); router.push("/compta"); }
      else { await creerFinance(f); router.push("/compta"); }
    } finally { setSaving(false); }
  }

  const cats = f.type === "recette" ? CAT_RECETTES : CAT_DEPENSES;

  if (!chantiers) return <div className="muted">Chargement…</div>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label>Type</label>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" className="done" data-on={f.type === "recette"} onClick={() => set("type", "recette")}>Recette</button>
          <button type="button" className="doing" data-on={f.type === "depense"} onClick={() => set("type", "depense")}>Dépense</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="montant">Montant (€)</label>
          <input id="montant" className="input" type="number" step="0.01" min="0" inputMode="decimal" required autoFocus
            value={f.montant || ""} placeholder="0" onChange={(e) => set("montant", Number(e.target.value) || 0)} />
        </div>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="cat">Catégorie</label>
          <input id="cat" className="input" list="cat-list" value={f.categorie} placeholder="Ex. Vente de bois"
            onChange={(e) => set("categorie", e.target.value)} />
          <datalist id="cat-list">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="field">
          <label htmlFor="chantier">Chantier <span className="opt">(optionnel)</span></label>
          <select id="chantier" className="select" value={f.chantierId ?? ""} onChange={(e) => set("chantierId", e.target.value || undefined)}>
            <option value="">Frais généraux (aucun chantier)</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="lib">Libellé <span className="opt">(optionnel)</span></label>
        <input id="lib" className="input" value={f.libelle} placeholder="Ex. Lot pin maritime, plein carburant…"
          onChange={(e) => set("libelle", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn primary big" disabled={saving || !f.montant}>
          <IcCheck /> {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter l'écriture"}
        </button>
        <button type="button" className="btn big" onClick={() => router.back()}><IcBack /> Annuler</button>
      </div>
    </form>
  );
}
