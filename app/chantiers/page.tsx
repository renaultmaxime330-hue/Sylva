"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUTS, type Statut } from "@/lib/db";
import { useChantiers } from "@/lib/queries/chantiers";
import StatutPill from "@/components/StatutPill";
import { formatSurface } from "@/lib/format";
import { IcSite, IcPlus, IcChevron, IcSearch } from "@/lib/icons";

export default function ChantiersPage() {
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<Statut | "tous">("tous");

  const { data: chantiers, isError, error } = useChantiers();

  if (isError) return <div className="muted" style={{ padding: 40 }}>Erreur : {error instanceof Error ? error.message : "échec du chargement."}</div>;
  if (!chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const ql = q.trim().toLowerCase();
  const filtres = chantiers.filter((c) => {
    if (filtre !== "tous" && c.statut !== filtre) return false;
    if (!ql) return true;
    return [c.nom, c.proprietaire, c.commune, c.numParcelle, c.essence, c.client]
      .join(" ").toLowerCase().includes(ql);
  });

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Chantiers</p>
          <h1>Mes chantiers</h1>
          <p className="sub">{chantiers.length} chantier{chantiers.length > 1 ? "s" : ""} au total.</p>
        </div>
        <div className="actions">
          <Link href="/chantiers/nouveau" className="btn primary big"><IcPlus /> Nouveau chantier</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <IcSearch />
          <input className="input" placeholder="Rechercher un chantier, propriétaire, commune…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="filters">
          <button className="chip-btn" data-on={filtre === "tous"} onClick={() => setFiltre("tous")}>Tous</button>
          {STATUTS.map((s) => (
            <button key={s.value} className="chip-btn" data-on={filtre === s.value}
              onClick={() => setFiltre(s.value)}>{s.label}</button>
          ))}
        </div>
      </div>

      {filtres.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcSite /></div>
          <h3>{chantiers.length === 0 ? "Aucun chantier" : "Aucun résultat"}</h3>
          <p>
            {chantiers.length === 0
              ? "Crée ton premier chantier pour commencer."
              : "Aucun chantier ne correspond à ta recherche ou à ce filtre."}
          </p>
          {chantiers.length === 0 && (
            <Link href="/chantiers/nouveau" className="btn primary big"><IcPlus /> Créer un chantier</Link>
          )}
        </div>
      ) : (
        <div className="list">
          {filtres.map((c) => (
            <Link key={c.id} href={`/chantiers/${c.id}`} className="row-card">
              <div className="glyph"><IcSite /></div>
              <div className="body">
                <div className="t">{c.nom}</div>
                <div className="m">
                  {c.proprietaire && <span>{c.proprietaire}</span>}
                  {c.commune && <>·<span>{c.commune}</span></>}
                  {c.numParcelle && <>·<span>Parc. {c.numParcelle}</span></>}
                  {c.surfaceHa != null && <>·<span>{formatSurface(c.surfaceHa)}</span></>}
                </div>
              </div>
              <StatutPill statut={c.statut} sm />
              <span className="chev"><IcChevron /></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
