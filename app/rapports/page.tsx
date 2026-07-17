"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { agreger, filtrePeriode, dansPeriode, type Periode } from "@/lib/production";
import { bilan } from "@/lib/finances";
import { formatHeures, formatM3 } from "@/lib/format";
import { downloadText } from "@/lib/export";
import { IcReport, IcPrint, IcDownload } from "@/lib/icons";

const eur = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const PERIODES: { v: Periode; label: string; titre: string }[] = [
  { v: "jour", label: "Jour", titre: "Aujourd'hui" },
  { v: "semaine", label: "Semaine", titre: "Cette semaine" },
  { v: "mois", label: "Mois", titre: "Ce mois-ci" },
  { v: "annee", label: "Année", titre: "Cette année" },
];

export default function RapportsPage() {
  const [periode, setPeriode] = useState<Periode>("mois");
  const [chantierId, setChantierId] = useState<string>("tous");

  const journees = useLiveQuery(() => db.journees.toArray(), []);
  const finances = useLiveQuery(() => db.finances.toArray(), []);
  const chantiers = useLiveQuery(() => db.chantiers.toArray(), []);

  if (!journees || !finances || !chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const nomChantier = (id?: string) => (id ? chantiers.find((c) => c.id === id)?.nom ?? "Chantier" : "Frais généraux");

  // Filtre période
  const jP = filtrePeriode(journees, periode).filter((j) => chantierId === "tous" || j.chantierId === chantierId);
  const fP = finances.filter((f) => dansPeriode(f.date, periode) && (chantierId === "tous" || f.chantierId === chantierId));

  const prod = agreger(jP);
  const compta = bilan(fP);
  const titrePeriode = PERIODES.find((p) => p.v === periode)!.titre;
  const titreChantier = chantierId === "tous" ? "Tous les chantiers" : nomChantier(chantierId);

  // Répartition par chantier (si "tous")
  const parChantier = chantiers
    .map((c) => {
      const js = jP.filter((j) => j.chantierId === c.id);
      const fs = fP.filter((f) => f.chantierId === c.id);
      return { nom: c.nom, prod: agreger(js), compta: bilan(fs), actif: js.length > 0 || fs.length > 0 };
    })
    .filter((r) => r.actif);

  const chantiersAvec = chantiers.filter((c) => journees.some((j) => j.chantierId === c.id) || finances.some((f) => f.chantierId === c.id));

  function exportCSV() {
    const L: string[] = [];
    L.push(`Rapport;${titrePeriode};${titreChantier}`);
    L.push("");
    L.push("Section;Indicateur;Valeur");
    L.push(`Production;Volume (m3);${prod.volume}`);
    L.push(`Production;Arbres coupes;${prod.arbres}`);
    L.push(`Production;Journees;${prod.nbJours}`);
    L.push(`Production;Rendement (m3/h machine);${prod.rendement ?? ""}`);
    L.push(`Temps;Heures travaillees;${prod.heures}`);
    L.push(`Temps;Heures machine;${prod.hMachine}`);
    L.push(`Temps;Deplacement (h);${prod.hDeplacement}`);
    L.push(`Comptabilite;Recettes (EUR);${compta.recettes}`);
    L.push(`Comptabilite;Depenses (EUR);${compta.depenses}`);
    L.push(`Comptabilite;Marge (EUR);${compta.marge}`);
    L.push(`Comptabilite;Rentabilite (%);${compta.rentabilite ?? ""}`);
    if (chantierId === "tous" && parChantier.length > 0) {
      L.push("");
      L.push("Par chantier;Volume (m3);Heures;Recettes;Depenses;Marge");
      for (const r of parChantier) L.push(`${r.nom};${r.prod.volume};${r.prod.heures};${r.compta.recettes};${r.compta.depenses};${r.compta.marge}`);
    }
    downloadText(`rapport-${periode}-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + L.join("\n"), "text/csv");
  }

  return (
    <div className="stack-gap">
      <div className="page-head no-print">
        <div className="titles">
          <p className="eyebrow">Rapports</p>
          <h1>Rapports &amp; exports</h1>
          <p className="sub">Un bilan clair de ta production, ton temps et ta marge — à imprimer, exporter en PDF ou en tableur.</p>
        </div>
        <div className="actions">
          <button className="btn primary big" onClick={() => window.print()}><IcPrint /> Imprimer / PDF</button>
          <button className="btn big" onClick={exportCSV}><IcDownload /> Export CSV</button>
        </div>
      </div>

      <div className="toolbar no-print">
        <div className="seg-mini wide">
          {PERIODES.map((p) => <button key={p.v} data-on={periode === p.v} onClick={() => setPeriode(p.v)}>{p.label}</button>)}
        </div>
        <div className="filters">
          <button className="chip-btn" data-on={chantierId === "tous"} onClick={() => setChantierId("tous")}>Tous</button>
          {chantiersAvec.map((c) => (
            <button key={c.id} className="chip-btn" data-on={chantierId === c.id} onClick={() => setChantierId(c.id)}>{c.nom}</button>
          ))}
        </div>
      </div>

      {/* Rapport imprimable */}
      <div className="report card pad">
        <div className="report-head">
          <div className="report-brand"><IcReport /> Sylva</div>
          <div className="report-meta">
            <div className="report-title">Rapport — {titrePeriode}</div>
            <div className="muted">{titreChantier} · édité le {new Date().toLocaleDateString("fr-FR")}</div>
          </div>
        </div>

        <h3 className="report-sec">Production</h3>
        <div className="report-grid">
          <div><span className="rk">Volume produit</span><span className="rv">{formatM3(prod.volume)}</span></div>
          <div><span className="rk">Arbres coupés</span><span className="rv">{prod.arbres.toLocaleString("fr-FR")}</span></div>
          <div><span className="rk">Journées</span><span className="rv">{prod.nbJours}</span></div>
          <div><span className="rk">Rendement</span><span className="rv">{prod.rendement != null ? `${prod.rendement.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m³/h` : "—"}</span></div>
        </div>

        <h3 className="report-sec">Temps de travail</h3>
        <div className="report-grid">
          <div><span className="rk">Heures travaillées</span><span className="rv">{formatHeures(prod.heures)}</span></div>
          <div><span className="rk">Heures machine</span><span className="rv">{formatHeures(prod.hMachine)}</span></div>
          <div><span className="rk">Déplacement</span><span className="rv">{formatHeures(prod.hDeplacement)}</span></div>
        </div>

        <h3 className="report-sec">Comptabilité</h3>
        <div className="report-grid">
          <div><span className="rk">Recettes</span><span className="rv" style={{ color: "var(--st-done)" }}>{eur(compta.recettes)}</span></div>
          <div><span className="rk">Dépenses</span><span className="rv" style={{ color: "var(--danger)" }}>{eur(compta.depenses)}</span></div>
          <div><span className="rk">Marge</span><span className="rv" style={{ color: compta.marge >= 0 ? "var(--accent-strong)" : "var(--danger)" }}>{eur(compta.marge)}</span></div>
          <div><span className="rk">Rentabilité</span><span className="rv">{compta.rentabilite != null ? `${compta.rentabilite.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "—"}</span></div>
        </div>

        {chantierId === "tous" && parChantier.length > 0 && (
          <>
            <h3 className="report-sec">Détail par chantier</h3>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Chantier</th><th>Volume</th><th>Heures</th><th>Recettes</th><th>Dépenses</th><th>Marge</th></tr></thead>
                <tbody>
                  {parChantier.map((r) => (
                    <tr key={r.nom}>
                      <td><b>{r.nom}</b></td>
                      <td>{formatM3(r.prod.volume)}</td>
                      <td>{formatHeures(r.prod.heures)}</td>
                      <td>{eur(r.compta.recettes)}</td>
                      <td>{eur(r.compta.depenses)}</td>
                      <td style={{ fontWeight: 700 }}>{eur(r.compta.marge)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {jP.length === 0 && fP.length === 0 && (
          <p className="muted" style={{ marginTop: 16 }}>Aucune donnée pour cette période. Choisis une autre période ou saisis des journées / écritures.</p>
        )}
      </div>
    </div>
  );
}
