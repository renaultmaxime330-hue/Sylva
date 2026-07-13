"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { amorcerDemo } from "@/lib/chantiers";
import { amorcerDemoProduction, agreger, filtrePeriode } from "@/lib/production";
import { formatHeures } from "@/lib/format";
import { IcClock, IcTruck, IcPin, IcSite, IcPlus } from "@/lib/icons";

type Periode = "semaine" | "mois" | "annee";
const LABELS: Record<Periode, string> = { semaine: "cette semaine", mois: "ce mois", annee: "cette année" };

export default function TempsPage() {
  const [periode, setPeriode] = useState<Periode>("mois");

  useEffect(() => {
    (async () => { await amorcerDemo(); await amorcerDemoProduction(); })();
  }, []);

  const journees = useLiveQuery(() => db.journees.orderBy("date").reverse().toArray(), []);
  const chantiers = useLiveQuery(() => db.chantiers.toArray(), []);

  if (!journees || !chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const nomChantier = (id: string) => chantiers.find((c) => c.id === id)?.nom ?? "Chantier";
  const dansPeriode = filtrePeriode(journees, periode);
  const t = agreger(dansPeriode);

  // Répartition des heures par chantier
  const parChantier = new Map<string, typeof dansPeriode>();
  for (const j of dansPeriode) {
    const arr = parChantier.get(j.chantierId) ?? [];
    arr.push(j);
    parChantier.set(j.chantierId, arr);
  }
  const repartition = Array.from(parChantier.entries())
    .map(([id, js]) => ({ id, nom: nomChantier(id), tot: agreger(js) }))
    .sort((a, b) => b.tot.heures - a.tot.heures);

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Production &amp; temps</p>
          <h1>Temps de travail</h1>
          <p className="sub">Heures travaillées, heures machine et déplacements — calculés à partir de tes journées.</p>
        </div>
        <div className="actions">
          <Link href="/production/nouvelle" className="btn primary big"><IcPlus /> Saisir une journée</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg-mini wide">
          {(["semaine", "mois", "annee"] as Periode[]).map((p) => (
            <button key={p} data-on={periode === p} onClick={() => setPeriode(p)}>
              {p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : "Année"}
            </button>
          ))}
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="k"><IcClock /> Heures travaillées</div><div className="v" style={{ fontSize: 26 }}>{formatHeures(t.heures)}</div></div>
        <div className="stat"><div className="k"><IcTruck /> Heures machine</div><div className="v" style={{ fontSize: 26 }}>{formatHeures(t.hMachine)}</div></div>
        <div className="stat"><div className="k"><IcPin /> Déplacement</div><div className="v" style={{ fontSize: 26 }}>{formatHeures(t.hDeplacement)}</div></div>
        <div className="stat"><div className="k"><IcSite /> Jours travaillés</div><div className="v">{t.nbJours}</div></div>
      </div>

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 14 }}>
          Répartition par chantier <span className="muted" style={{ fontWeight: 500, fontSize: 15 }}>({LABELS[periode]})</span>
        </h2>
        {repartition.length === 0 ? (
          <div className="card pad empty">
            <div className="ic"><IcClock /></div>
            <h3>Aucune heure enregistrée</h3>
            <p>Saisis une journée de travail pour voir la répartition de tes heures.</p>
            <Link href="/production/nouvelle" className="btn primary big"><IcPlus /> Saisir une journée</Link>
          </div>
        ) : (
          <div className="list">
            {repartition.map((r) => (
              <div className="jrow" key={r.id}>
                <div className="glyph" style={{ width: 46, height: 46, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <IcSite />
                </div>
                <div className="jbody">
                  <div className="t">{r.nom}</div>
                  <div className="m">
                    <span><b>{formatHeures(r.tot.heures)}</b> travaillées</span>
                    <span>{formatHeures(r.tot.hMachine)} machine</span>
                    <span>{r.tot.nbJours} jour{r.tot.nbJours > 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
