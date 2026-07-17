"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MATERIEL_CATEGORIES, type Materiel, type MaterielCategorie } from "@/lib/db";
import { creerMateriel, modifierMateriel, champsVidesMateriel, type MaterielInput } from "@/lib/materiel";
import { IcCheck, IcBack } from "@/lib/icons";

export default function MaterielForm({ initial }: { initial?: Materiel }) {
  const router = useRouter();
  const editing = !!initial;
  const [f, setF] = useState<MaterielInput>(
    initial
      ? { categorie: initial.categorie, nom: initial.nom, quantite: initial.quantite, unite: initial.unite, seuilAlerte: initial.seuilAlerte, notes: initial.notes }
      : champsVidesMateriel()
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MaterielInput>(k: K, v: MaterielInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? undefined : Number(v));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nom.trim()) return;
    setSaving(true);
    try {
      if (editing && initial) { await modifierMateriel(initial.id, f); router.push("/materiel"); }
      else { await creerMateriel(f); router.push("/materiel"); }
    } finally { setSaving(false); }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="cat">Catégorie</label>
          <select id="cat" className="select" value={f.categorie} onChange={(e) => set("categorie", e.target.value as MaterielCategorie)}>
            {MATERIEL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="nom">Nom de l&apos;article</label>
          <input id="nom" className="input" value={f.nom} required autoFocus placeholder="Ex. Chaînes .325"
            onChange={(e) => set("nom", e.target.value)} />
        </div>
      </div>

      <div className="grid-3">
        <div className="field">
          <label htmlFor="q">Quantité</label>
          <input id="q" className="input" type="number" step="0.1" min="0" inputMode="decimal"
            value={f.quantite} onChange={(e) => set("quantite", Number(e.target.value) || 0)} />
        </div>
        <div className="field">
          <label htmlFor="u">Unité</label>
          <input id="u" className="input" value={f.unite} placeholder="u, L, m…" onChange={(e) => set("unite", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s">Seuil d&apos;alerte <span className="opt">(optionnel)</span></label>
          <input id="s" className="input" type="number" step="0.1" min="0" inputMode="decimal"
            value={f.seuilAlerte ?? ""} placeholder="Ex. 4" onChange={(e) => set("seuilAlerte", num(e.target.value))} />
          <span className="hint">Alerte « stock bas » si la quantité passe en dessous.</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" className="textarea" value={f.notes} placeholder="Référence, fournisseur…" onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn primary big" disabled={saving || !f.nom.trim()}>
          <IcCheck /> {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter l'article"}
        </button>
        <button type="button" className="btn big" onClick={() => router.back()}><IcBack /> Annuler</button>
      </div>
    </form>
  );
}
