"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUTS, type Chantier, type Statut } from "@/lib/db";
import { creerChantier, modifierChantier, obtenirPosition, type ChantierInput } from "@/lib/chantiers";
import { IcPin, IcCheck, IcBack } from "@/lib/icons";
import { formatGPS } from "@/lib/format";

const PEUPLEMENTS = ["Futaie régulière", "Futaie irrégulière", "Taillis", "Éclaircie", "Coupe rase", "Chablis", "Autre"];

function champsVides(): ChantierInput {
  return {
    nom: "", proprietaire: "", client: "", numParcelle: "", commune: "",
    lat: undefined, lng: undefined, surfaceHa: undefined,
    typePeuplement: "", essence: "", dateDebut: "", dateFin: "",
    statut: "a_faire", notes: "",
  };
}

export default function ChantierForm({ initial }: { initial?: Chantier }) {
  const router = useRouter();
  const editing = !!initial;
  const [f, setF] = useState<ChantierInput>(
    initial
      ? {
          nom: initial.nom, proprietaire: initial.proprietaire, client: initial.client,
          numParcelle: initial.numParcelle, commune: initial.commune,
          lat: initial.lat, lng: initial.lng, surfaceHa: initial.surfaceHa,
          typePeuplement: initial.typePeuplement, essence: initial.essence,
          dateDebut: initial.dateDebut ?? "", dateFin: initial.dateFin ?? "",
          statut: initial.statut, notes: initial.notes,
        }
      : champsVides()
  );
  const [saving, setSaving] = useState(false);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [geoErr, setGeoErr] = useState("");

  const set = <K extends keyof ChantierInput>(k: K, v: ChantierInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  async function capterGPS() {
    setGeoState("loading");
    setGeoErr("");
    try {
      const { lat, lng } = await obtenirPosition();
      set("lat", lat);
      set("lng", lng);
      setGeoState("idle");
    } catch (e) {
      setGeoState("error");
      setGeoErr(e instanceof Error ? e.message : "Position indisponible.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nom.trim()) return;
    setSaving(true);
    try {
      if (editing && initial) {
        await modifierChantier(initial.id, f);
        router.push(`/chantiers/${initial.id}`);
      } else {
        const id = await creerChantier(f);
        router.push(`/chantiers/${id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="nom">Nom du chantier</label>
        <input id="nom" className="input" value={f.nom} required autoFocus
          placeholder="Ex. Coupe rase des Grands Pins"
          onChange={(e) => set("nom", e.target.value)} />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="prop">Propriétaire</label>
          <input id="prop" className="input" value={f.proprietaire}
            placeholder="Ex. M. Lartigue"
            onChange={(e) => set("proprietaire", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="client">Client / donneur d'ordre <span className="opt">(optionnel)</span></label>
          <input id="client" className="input" value={f.client}
            placeholder="Ex. GF de Sabres"
            onChange={(e) => set("client", e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="parc">Numéro de parcelle</label>
          <input id="parc" className="input" value={f.numParcelle}
            placeholder="Ex. B 412"
            onChange={(e) => set("numParcelle", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="com">Commune</label>
          <input id="com" className="input" value={f.commune}
            placeholder="Ex. Sabres (40)"
            onChange={(e) => set("commune", e.target.value)} />
        </div>
      </div>

      {/* GPS */}
      <div className="field">
        <label>Coordonnées GPS</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn" onClick={capterGPS} disabled={geoState === "loading"}>
            <IcPin /> {geoState === "loading" ? "Localisation…" : "Ma position actuelle"}
          </button>
          <span className="mono" style={{ fontSize: 14, color: "var(--text-muted)" }}>
            {formatGPS(f.lat, f.lng)}
          </span>
          {(f.lat != null || f.lng != null) && (
            <button type="button" className="btn ghost" onClick={() => { set("lat", undefined); set("lng", undefined); }}>
              Effacer
            </button>
          )}
        </div>
        {geoState === "error" && <span className="hint" style={{ color: "var(--danger)" }}>{geoErr}</span>}
        <span className="hint">Sur le terrain, appuie sur « Ma position » pour enregistrer les coordonnées automatiquement.</span>
      </div>

      <div className="grid-3">
        <div className="field">
          <label htmlFor="surf">Surface (ha)</label>
          <input id="surf" className="input" type="number" step="0.001" min="0" inputMode="decimal"
            value={f.surfaceHa ?? ""} placeholder="0,000"
            onChange={(e) => set("surfaceHa", e.target.value === "" ? undefined : Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="peupl">Type de peuplement</label>
          <select id="peupl" className="select" value={f.typePeuplement}
            onChange={(e) => set("typePeuplement", e.target.value)}>
            <option value="">—</option>
            {PEUPLEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ess">Essence</label>
          <input id="ess" className="input" value={f.essence}
            placeholder="Ex. Pin maritime"
            onChange={(e) => set("essence", e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="dd">Date de début</label>
          <input id="dd" className="input" type="date" value={f.dateDebut}
            onChange={(e) => set("dateDebut", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="df">Date de fin <span className="opt">(prévue ou réelle)</span></label>
          <input id="df" className="input" type="date" value={f.dateFin}
            onChange={(e) => set("dateFin", e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Statut</label>
        <div className="seg">
          {STATUTS.map((s) => (
            <button key={s.value} type="button" className={s.cls}
              data-on={f.statut === s.value}
              onClick={() => set("statut", s.value as Statut)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" className="textarea" value={f.notes}
          placeholder="Accès, consignes de sécurité, remarques…"
          onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn primary big" disabled={saving || !f.nom.trim()}>
          <IcCheck /> {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Créer le chantier"}
        </button>
        <button type="button" className="btn big" onClick={() => router.back()}>
          <IcBack /> Annuler
        </button>
      </div>
    </form>
  );
}
