"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { amorcerDemo } from "@/lib/chantiers";
import {
  amorcerDemoProduction, agreger, filtrePeriode, serieParJour, serieParMois,
  heuresTravaillees, rendementJournee, nbArbres, supprimerJournee,
} from "@/lib/production";
import { formatHeures, formatM3 } from "@/lib/format";
import ProductionChart from "@/components/ProductionChart";
import { IcChart, IcPlus, IcClock, IcSite, IcTree, IcEdit, IcTrash, IcCheck } from "@/lib/icons";

export default function ProductionPage() {
  const [filtreChantier, setFiltreChantier] = useState<string>("tous");
  const [vue, setVue] = useState<"jours" | "mois">("jours");

  useEffect(() => {
    (async () => { await amorcerDemo(); await amorcerDemoProduction(); })();
  }, []);

  const journees = useLiveQuery(() => db.journees.orderBy("date").reverse().toArray(), []);
  const chantiers = useLiveQuery(() => db.chantiers.toArray(), []);

  if (!journees || !chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const nomChantier = (id: string) => chantiers.find((c) => c.id === id)?.nom ?? "Chantier";
  const filtrees = filtreChantier === "tous" ? journees : journees.filter((j) => j.chantierId === filtreChantier);

  const jour = agreger(filtrePeriode(filtrees, "jour"));
  const semaine = agreger(filtrePeriode(filtrees, "semaine"));
  const mois = agreger(filtrePeriode(filtrees, "mois"));
  const annee = agreger(filtrePeriode(filtrees, "annee"));

  const chartData = vue === "jours"
    ? serieParJour(filtrees, 14).map((d) => ({ label: d.label, volume: d.volume }))
    : serieParMois(filtrees).map((d) => ({ label: d.label, volume: d.volume }));

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Production &amp; temps</p>
          <h1>Production</h1>
          <p className="sub">Saisis ta journée : l&apos;app calcule heures, rendement et totaux automatiquement.</p>
        </div>
        <div className="actions">
          <Link href="/production/nouvelle" className="btn primary big"><IcPlus /> Saisir une journée</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="filters">
          <button className="chip-btn" data-on={filtreChantier === "tous"} onClick={() => setFiltreChantier("tous")}>Tous les chantiers</button>
          {chantiers.filter((c) => journees.some((j) => j.chantierId === c.id)).map((c) => (
            <button key={c.id} className="chip-btn" data-on={filtreChantier === c.id} onClick={() => setFiltreChantier(c.id)}>{c.nom}</button>
          ))}
        </div>
      </div>

      {/* Statistiques */}
      <div className="stats">
        <div className="stat"><div className="k"><IcChart /> Aujourd&apos;hui</div><div className="v">{jour.volume.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div></div>
        <div className="stat"><div className="k"><IcChart /> Cette semaine</div><div className="v">{semaine.volume.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div></div>
        <div className="stat"><div className="k"><IcChart /> Ce mois</div><div className="v">{mois.volume.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div></div>
        <div className="stat"><div className="k"><IcChart /> Cette année</div><div className="v">{annee.volume.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div></div>
        <div className="stat"><div className="k"><IcTree /> Arbres (année)</div><div className="v">{annee.arbres.toLocaleString("fr-FR")}</div></div>
        <div className="stat"><div className="k"><IcClock /> Heures (mois)</div><div className="v" style={{ fontSize: 26 }}>{formatHeures(mois.heures)}</div></div>
        <div className="stat"><div className="k"><IcCheck /> Rendement moyen</div><div className="v">{annee.rendement != null ? annee.rendement.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—"}<small>m³/h</small></div></div>
      </div>

      {/* Graphique */}
      <div className="card pad">
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em", flex: 1 }}>Volume produit</h2>
          <div className="seg-mini wide">
            <button data-on={vue === "jours"} onClick={() => setVue("jours")}>14 jours</button>
            <button data-on={vue === "mois"} onClick={() => setVue("mois")}>12 mois</button>
          </div>
        </div>
        <ProductionChart data={chartData} />
      </div>

      {/* Journal */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 14 }}>Journal</h2>
        {filtrees.length === 0 ? (
          <div className="card pad empty">
            <div className="ic"><IcChart /></div>
            <h3>Aucune journée saisie</h3>
            <p>Enregistre ta première journée de travail pour suivre ta production et ton rendement.</p>
            <Link href="/production/nouvelle" className="btn primary big"><IcPlus /> Saisir une journée</Link>
          </div>
        ) : (
          <div className="list">
            {filtrees.map((j) => {
              const d = new Date(j.date + "T00:00:00");
              const h = heuresTravaillees(j);
              const rdt = rendementJournee(j);
              return (
                <div className="jrow" key={j.id}>
                  <div className="jdate">
                    <div className="d">{d.toLocaleDateString("fr-FR", { day: "2-digit" })}</div>
                    <div className="mo">{d.toLocaleDateString("fr-FR", { month: "short" })}</div>
                  </div>
                  <div className="jbody">
                    <div className="t">{nomChantier(j.chantierId)}</div>
                    <div className="m">
                      {j.volumeM3 != null && <span><b>{formatM3(j.volumeM3)}</b></span>}
                      {nbArbres(j) > 0 && <span>{nbArbres(j)} arbres</span>}
                      {h != null && <span>{formatHeures(h)}</span>}
                      {rdt != null && <span><b>{rdt.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m³/h</b></span>}
                    </div>
                  </div>
                  <div className="jactions">
                    <Link href={`/production/${j.id}/modifier`} className="iconbtn" aria-label="Modifier"><IcEdit /></Link>
                    <button className="iconbtn" aria-label="Supprimer"
                      onClick={() => { if (confirm("Supprimer cette journée ?")) supprimerJournee(j.id); }}>
                      <IcTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
