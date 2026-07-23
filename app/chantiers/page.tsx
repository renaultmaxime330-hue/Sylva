"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUTS, type Statut } from "@/lib/db";
import { useChantiers } from "@/lib/queries/chantiers";
import { useDossiers } from "@/lib/queries/dossiers";
import StatutPill from "@/components/StatutPill";
import DossiersManager from "@/components/DossiersManager";
import { IcSite, IcPlus, IcChevron, IcSearch, IcFolder, IcSettings } from "@/lib/icons";

const SANS_DOSSIER = "sans-dossier";

export default function ChantiersPage() {
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<Statut | "tous">("tous");
  const [filtreDossier, setFiltreDossier] = useState<string>("tous");
  const [gererOuvert, setGererOuvert] = useState(false);

  const { data: chantiers, isError, error } = useChantiers();
  const { data: dossiers } = useDossiers();

  if (isError) return <div className="muted" style={{ padding: 40 }}>Erreur : {error instanceof Error ? error.message : "échec du chargement."}</div>;
  if (!chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const dossierDe = (id?: string) => (dossiers ?? []).find((d) => d.id === id);

  const ql = q.trim().toLowerCase();
  const filtres = chantiers.filter((c) => {
    if (filtre !== "tous" && c.statut !== filtre) return false;
    if (filtreDossier === SANS_DOSSIER && c.dossierId) return false;
    if (filtreDossier !== "tous" && filtreDossier !== SANS_DOSSIER && c.dossierId !== filtreDossier) return false;
    if (!ql) return true;
    return [c.nom, c.proprietaire, c.commune, c.numParcelle, c.essence, c.client]
      .join(" ").toLowerCase().includes(ql);
  });
  const surfaceTotale = chantiers.reduce((s, c) => s + (c.surfaceHa ?? 0), 0);

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Index de terrain</p>
          <h1>Chantiers</h1>
          <p className="sub">
            {chantiers.length} chantier{chantiers.length > 1 ? "s" : ""}
            {surfaceTotale > 0 && ` · ${surfaceTotale.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ha suivis`}
          </p>
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

      <div className="toolbar">
        <div className="filters" style={{ flex: 1 }}>
          <button className="chip-btn" data-on={filtreDossier === "tous"} onClick={() => setFiltreDossier("tous")}>
            <IcFolder /> Tous les dossiers
          </button>
          {(dossiers ?? []).sort((a, b) => a.ordre - b.ordre).map((d) => (
            <button key={d.id} className="chip-btn" data-on={filtreDossier === d.id} onClick={() => setFiltreDossier(d.id)}>
              <span className="dossier-dot" style={{ background: d.couleur }} /> {d.nom}
            </button>
          ))}
          {chantiers.some((c) => !c.dossierId) && (
            <button className="chip-btn" data-on={filtreDossier === SANS_DOSSIER} onClick={() => setFiltreDossier(SANS_DOSSIER)}>
              Sans dossier
            </button>
          )}
        </div>
        <button type="button" className="btn" onClick={() => setGererOuvert((v) => !v)}>
          <IcSettings /> {gererOuvert ? "Fermer" : "Gérer les dossiers"}
        </button>
      </div>

      {gererOuvert && <DossiersManager onDone={() => setGererOuvert(false)} />}

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
        <div className="terrain-list">
          {filtres.map((c) => {
            const dossier = dossierDe(c.dossierId);
            return (
            <Link key={c.id} href={`/chantiers/${c.id}`} className="terrain-row">
              <span className="terrain-tag">{c.numParcelle || "—"}</span>
              <div className="terrain-body">
                <div className="t">
                  {c.nom}
                  {dossier && <span className="dossier-badge"><span className="dossier-dot" style={{ background: dossier.couleur }} />{dossier.nom}</span>}
                </div>
                <div className="m">
                  {c.proprietaire && <span>{c.proprietaire}</span>}
                  {c.commune && <>·<span>{c.commune}</span></>}
                  {c.essence && <>·<span>{c.essence}</span></>}
                </div>
              </div>
              {c.surfaceHa != null && (
                <span className="terrain-surf"><span className="n">{c.surfaceHa.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span><span className="u">ha</span></span>
              )}
              <StatutPill statut={c.statut} sm />
              <span className="terrain-chev"><IcChevron /></span>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
