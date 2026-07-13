"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, totalVolume } from "@/lib/db";
import { amorcerDemo } from "@/lib/chantiers";
import StatutPill from "@/components/StatutPill";
import { formatSurface } from "@/lib/format";
import { IcSite, IcPlus, IcChevron, IcRuler, IcCheck, IcClock, IcChart } from "@/lib/icons";

export default function Dashboard() {
  useEffect(() => {
    amorcerDemo();
  }, []);

  const chantiers = useLiveQuery(() => db.chantiers.orderBy("updatedAt").reverse().toArray(), []);

  if (!chantiers) {
    return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  }

  const enCours = chantiers.filter((c) => c.statut === "en_cours").length;
  const aFaire = chantiers.filter((c) => c.statut === "a_faire").length;
  const termine = chantiers.filter((c) => c.statut === "termine").length;
  const surfaceTotale = chantiers.reduce((s, c) => s + (c.surfaceHa ?? 0), 0);
  const volumeTotal = chantiers.reduce((s, c) => s + totalVolume(c), 0);
  const recents = chantiers.slice(0, 4);

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Tableau de bord</p>
          <h1>Bonjour 👋</h1>
          <p className="sub">Voici l'état de tes chantiers aujourd'hui.</p>
        </div>
        <div className="actions">
          <Link href="/chantiers/nouveau" className="btn primary big"><IcPlus /> Nouveau chantier</Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="k"><IcClock /> En cours</div>
          <div className="v">{enCours}</div>
        </div>
        <div className="stat">
          <div className="k"><IcSite /> À faire</div>
          <div className="v">{aFaire}</div>
        </div>
        <div className="stat">
          <div className="k"><IcCheck /> Terminés</div>
          <div className="v">{termine}</div>
        </div>
        <div className="stat">
          <div className="k"><IcRuler /> Surface totale</div>
          <div className="v">{surfaceTotale.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>ha</small></div>
        </div>
        <div className="stat">
          <div className="k"><IcChart /> m³ produits</div>
          <div className="v">{volumeTotal.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div>
        </div>
      </div>

      <section>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", flex: 1 }}>Chantiers récents</h2>
          <Link href="/chantiers" className="btn ghost">Tout voir <IcChevron /></Link>
        </div>

        {recents.length === 0 ? (
          <div className="card pad empty">
            <div className="ic"><IcSite /></div>
            <h3>Aucun chantier pour l'instant</h3>
            <p>Crée ton premier chantier pour commencer à suivre ta production.</p>
            <Link href="/chantiers/nouveau" className="btn primary big"><IcPlus /> Créer un chantier</Link>
          </div>
        ) : (
          <div className="list">
            {recents.map((c) => (
              <Link key={c.id} href={`/chantiers/${c.id}`} className="row-card">
                <div className="glyph"><IcSite /></div>
                <div className="body">
                  <div className="t">{c.nom}</div>
                  <div className="m">
                    <span>{c.commune || "Commune ?"}</span>
                    {c.surfaceHa != null && <>·<span>{formatSurface(c.surfaceHa)}</span></>}
                    {c.essence && <>·<span>{c.essence}</span></>}
                  </div>
                </div>
                <StatutPill statut={c.statut} sm />
                <span className="chev"><IcChevron /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
