"use client";

import { useRef, useState } from "react";
import { CATEGORIES_BOIS, newId, type Chantier, type VolumeCategorie } from "@/lib/db";
import { majVolumes } from "@/lib/chantiers";
import { IcPlus, IcTrash, IcCheck, IcChart } from "@/lib/icons";

function formatM3(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export default function VolumesChantier({ chantier }: { chantier: Chantier }) {
  const [rows, setRows] = useState<VolumeCategorie[]>(() => chantier.volumes ?? []);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = rows.reduce((s, r) => s + (Number(r.m3) || 0), 0);

  function persist(next: VolumeCategorie[]) {
    setRows(next);
    majVolumes(chantier.id, next);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1600);
  }

  function ajouter(categorie = "") {
    persist([...rows, { id: newId(), categorie, m3: 0 }]);
  }
  function modifier(id: string, patch: Partial<VolumeCategorie>) {
    persist(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function retirer(id: string) {
    persist(rows.filter((r) => r.id !== id));
  }

  const dejaUtilisees = new Set(rows.map((r) => r.categorie.trim().toLowerCase()));
  const suggestions = CATEGORIES_BOIS.filter((c) => !dejaUtilisees.has(c.toLowerCase()));

  return (
    <div className="stack-gap">
      {/* Total */}
      <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div className="glyph" style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <IcChart />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div className="k" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", fontWeight: 700 }}>Volume total produit</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>
            {formatM3(total)}<small style={{ fontSize: 18, fontWeight: 600, color: "var(--text-muted)", marginLeft: 6 }}>m³</small>
          </div>
        </div>
        {saved && (
          <span className="pill done sm" aria-live="polite"><IcCheck /> Enregistré</span>
        )}
      </div>

      {/* Ajout rapide quand aucune ligne */}
      {rows.length === 0 && (
        <div className="card pad">
          <p className="muted" style={{ marginBottom: 14 }}>Ajoute les volumes par catégorie de bois. Choisis une catégorie courante ou saisis la tienne.</p>
          <div className="filters">
            {CATEGORIES_BOIS.map((c) => (
              <button key={c} className="chip-btn" onClick={() => ajouter(c)}>
                <IcPlus /> {c}
              </button>
            ))}
            <button className="chip-btn" onClick={() => ajouter("")}><IcPlus /> Autre…</button>
          </div>
        </div>
      )}

      {/* Lignes catégorie → m³ */}
      {rows.length > 0 && (
        <div className="stack-gap">
          <datalist id="cat-bois">
            {CATEGORIES_BOIS.map((c) => <option key={c} value={c} />)}
          </datalist>

          <div className="list">
            {rows.map((r) => (
              <div className="vol-row" key={r.id}>
                <input
                  className="input"
                  list="cat-bois"
                  placeholder="Catégorie (ex. Bois d'œuvre)"
                  value={r.categorie}
                  onChange={(e) => modifier(r.id, { categorie: e.target.value })}
                />
                <div className="vol-m3">
                  <input
                    className="input"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={r.m3 === 0 ? "" : r.m3}
                    onChange={(e) => modifier(r.id, { m3: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                  <span className="unit">m³</span>
                </div>
                <button className="iconbtn" aria-label="Retirer la catégorie" onClick={() => retirer(r.id)}>
                  <IcTrash />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => ajouter("")}><IcPlus /> Ajouter une catégorie</button>
            {suggestions.slice(0, 4).map((c) => (
              <button key={c} className="chip-btn" onClick={() => ajouter(c)}><IcPlus /> {c}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
