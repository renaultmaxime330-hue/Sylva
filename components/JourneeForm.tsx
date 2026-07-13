"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Journee } from "@/lib/db";
import {
  creerJournee, modifierJournee, heuresTravaillees, type JourneeInput, champsVidesJournee,
} from "@/lib/production";
import { formatHeures } from "@/lib/format";
import { IcCheck, IcBack, IcChart, IcClock } from "@/lib/icons";

export default function JourneeForm({ initial, chantierId }: { initial?: Journee; chantierId?: string }) {
  const router = useRouter();
  const editing = !!initial;
  const chantiers = useLiveQuery(() => db.chantiers.orderBy("updatedAt").reverse().toArray(), []);

  const [f, setF] = useState<JourneeInput>(
    initial
      ? {
          chantierId: initial.chantierId, date: initial.date,
          volumeM3: initial.volumeM3, nbPins: initial.nbPins, nbAutres: initial.nbAutres,
          heureDebut: initial.heureDebut ?? "", heureFin: initial.heureFin ?? "",
          pauseMin: initial.pauseMin, hMachine: initial.hMachine, hDeplacement: initial.hDeplacement,
          notes: initial.notes,
        }
      : champsVidesJournee(chantierId)
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof JourneeInput>(k: K, v: JourneeInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? undefined : Number(v));

  const heures = heuresTravaillees(f);
  const rendement = f.hMachine != null && f.hMachine > 0 && f.volumeM3 != null
    ? Math.round((f.volumeM3 / f.hMachine) * 100) / 100
    : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.chantierId || !f.date) return;
    setSaving(true);
    try {
      if (editing && initial) {
        await modifierJournee(initial.id, f);
        router.push("/production");
      } else {
        await creerJournee(f);
        router.push("/production");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!chantiers) return <div className="muted">Chargement…</div>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" className="input" type="date" value={f.date} required
            onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="chantier">Chantier</label>
          <select id="chantier" className="select" value={f.chantierId} required
            onChange={(e) => set("chantierId", e.target.value)}>
            <option value="">— Choisir un chantier —</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}{c.commune ? ` — ${c.commune}` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="fset">
        <legend><IcChart /> Production</legend>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="vol">Volume produit (m³)</label>
            <input id="vol" className="input" type="number" step="0.1" min="0" inputMode="decimal"
              value={f.volumeM3 ?? ""} placeholder="0" autoFocus
              onChange={(e) => set("volumeM3", num(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="pins">Pins coupés</label>
            <input id="pins" className="input" type="number" min="0" inputMode="numeric"
              value={f.nbPins ?? ""} placeholder="0"
              onChange={(e) => set("nbPins", num(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="autres">Autres essences</label>
            <input id="autres" className="input" type="number" min="0" inputMode="numeric"
              value={f.nbAutres ?? ""} placeholder="0"
              onChange={(e) => set("nbAutres", num(e.target.value))} />
          </div>
        </div>
      </fieldset>

      <fieldset className="fset">
        <legend><IcClock /> Temps de travail</legend>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="hd">Heure de début</label>
            <input id="hd" className="input" type="time" value={f.heureDebut}
              onChange={(e) => set("heureDebut", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hf">Heure de fin</label>
            <input id="hf" className="input" type="time" value={f.heureFin}
              onChange={(e) => set("heureFin", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pause">Pause (min)</label>
            <input id="pause" className="input" type="number" min="0" inputMode="numeric"
              value={f.pauseMin ?? ""} placeholder="0"
              onChange={(e) => set("pauseMin", num(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="hmach">Heures machine</label>
            <input id="hmach" className="input" type="number" step="0.1" min="0" inputMode="decimal"
              value={f.hMachine ?? ""} placeholder="0"
              onChange={(e) => set("hMachine", num(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="hdep">Temps de déplacement (h)</label>
            <input id="hdep" className="input" type="number" step="0.1" min="0" inputMode="decimal"
              value={f.hDeplacement ?? ""} placeholder="0"
              onChange={(e) => set("hDeplacement", num(e.target.value))} />
          </div>
        </div>
      </fieldset>

      {/* Calculs automatiques */}
      <div className="calc-row">
        <div className="calc">
          <span className="k">Heures travaillées</span>
          <span className="v">{heures != null ? formatHeures(heures) : "—"}</span>
        </div>
        <div className="calc">
          <span className="k">Rendement (par heure machine)</span>
          <span className="v">{rendement != null ? `${rendement.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m³/h` : "—"}</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" className="textarea" value={f.notes}
          placeholder="Météo, incident, remarque…"
          onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn primary big" disabled={saving || !f.chantierId || !f.date}>
          <IcCheck /> {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Enregistrer la journée"}
        </button>
        <button type="button" className="btn big" onClick={() => router.back()}>
          <IcBack /> Annuler
        </button>
      </div>
    </form>
  );
}
