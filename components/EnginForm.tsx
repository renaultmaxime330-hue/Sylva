"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ENGIN_TYPES, type Engin, type EnginType } from "@/lib/db";
import { creerEngin, modifierEngin, champsVidesEngin, type EnginInput } from "@/lib/engins";
import { IcCheck, IcBack } from "@/lib/icons";

export default function EnginForm({ initial }: { initial?: Engin }) {
  const router = useRouter();
  const editing = !!initial;
  const [f, setF] = useState<EnginInput>(
    initial
      ? {
          type: initial.type, nom: initial.nom, marque: initial.marque ?? "", modele: initial.modele ?? "",
          heuresTotal: initial.heuresTotal, coutHoraire: initial.coutHoraire, seuilEntretienH: initial.seuilEntretienH,
          actif: initial.actif, notes: initial.notes,
        }
      : champsVidesEngin()
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof EnginInput>(k: K, v: EnginInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? undefined : Number(v));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nom.trim()) return;
    setSaving(true);
    try {
      if (editing && initial) { await modifierEngin(initial.id, f); router.push(`/engins/${initial.id}`); }
      else { const id = await creerEngin(f); router.push(`/engins/${id}`); }
    } finally { setSaving(false); }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="type">Type de machine</label>
          <select id="type" className="select" value={f.type} onChange={(e) => set("type", e.target.value as EnginType)}>
            {ENGIN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="nom">Nom</label>
          <input id="nom" className="input" value={f.nom} required autoFocus placeholder="Ex. Tronçonneuse 1"
            onChange={(e) => set("nom", e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="marque">Marque <span className="opt">(optionnel)</span></label>
          <input id="marque" className="input" value={f.marque} placeholder="Ex. Stihl, Ponsse…"
            onChange={(e) => set("marque", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="modele">Modèle <span className="opt">(optionnel)</span></label>
          <input id="modele" className="input" value={f.modele} onChange={(e) => set("modele", e.target.value)} />
        </div>
      </div>

      <div className="grid-3">
        <div className="field">
          <label htmlFor="h">Compteur d&apos;heures</label>
          <input id="h" className="input" type="number" step="0.1" min="0" inputMode="decimal"
            value={f.heuresTotal ?? ""} placeholder="0" onChange={(e) => set("heuresTotal", num(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="cout">Coût horaire (€/h)</label>
          <input id="cout" className="input" type="number" step="0.1" min="0" inputMode="decimal"
            value={f.coutHoraire ?? ""} placeholder="0" onChange={(e) => set("coutHoraire", num(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="seuil">Entretien tous les… (h)</label>
          <input id="seuil" className="input" type="number" step="1" min="0" inputMode="numeric"
            value={f.seuilEntretienH ?? ""} placeholder="Ex. 250" onChange={(e) => set("seuilEntretienH", num(e.target.value))} />
          <span className="hint">Sert à déclencher l&apos;alerte d&apos;entretien.</span>
        </div>
      </div>

      <div className="field">
        <label>Statut</label>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" className="done" data-on={f.actif} onClick={() => set("actif", true)}>En service</button>
          <button type="button" className="todo" data-on={!f.actif} onClick={() => set("actif", false)}>Hors service</button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" className="textarea" value={f.notes} placeholder="N° de série, remarques…"
          onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn primary big" disabled={saving || !f.nom.trim()}>
          <IcCheck /> {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer l'engin"}
        </button>
        <button type="button" className="btn big" onClick={() => router.back()}><IcBack /> Annuler</button>
      </div>
    </form>
  );
}
