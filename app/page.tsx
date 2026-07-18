"use client";

import Link from "next/link";
import { totalVolume } from "@/lib/db";
import { useChantiers } from "@/lib/queries/chantiers";
import StatutPill from "@/components/StatutPill";
import { formatSurface } from "@/lib/format";
import { IcSite, IcPlus, IcChevron } from "@/lib/icons";

function dateDuJour(): string {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function titrePlate(enCours: number, aFaire: number, termine: number, total: number): string {
  if (total === 0) return "Prêt pour le premier chantier";
  if (enCours > 0) return `${enCours} chantier${enCours > 1 ? "s" : ""} en cours`;
  if (aFaire > 0) return `${aFaire} chantier${aFaire > 1 ? "s" : ""} à préparer`;
  if (termine > 0) return "Tous les chantiers sont terminés";
  return "Carnet à jour";
}

export default function Dashboard() {
  const { data: chantiers, isError, error } = useChantiers();

  if (isError) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcSite /></div>
        <h3>Rejoins ou crée une équipe</h3>
        <p>{error instanceof Error ? error.message : "Une équipe est nécessaire pour voir tes chantiers."}</p>
        <Link href="/reglages" className="btn primary big">Aller aux réglages</Link>
      </div>
    );
  }
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
      <header className="dash-plate">
        <div className="dash-plate-meta">
          <span className="dash-eyebrow">Carnet de chantier · {dateDuJour()}</span>
          <h1 className="dash-title">{titrePlate(enCours, aFaire, termine, chantiers.length)}</h1>
          <p className="dash-sub">
            {surfaceTotale > 0 || volumeTotal > 0
              ? `${surfaceTotale.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ha suivis, ${volumeTotal.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m³ produits à ce jour.`
              : "Crée un chantier pour commencer à tenir le carnet."}
          </p>
        </div>
        <Link href="/chantiers/nouveau" className="btn primary big"><IcPlus /> Nouveau chantier</Link>
      </header>

      {chantiers.length > 0 && (
        <div className="dash-legend">
          <div className="li" style={{ borderLeftColor: "var(--st-todo)" }}>
            <span className="lk">À faire</span>
            <div className="lv">{aFaire}</div>
          </div>
          <div className="li" style={{ borderLeftColor: "var(--st-done)" }}>
            <span className="lk">Terminés</span>
            <div className="lv">{termine}</div>
          </div>
          <div className="li" style={{ borderLeftColor: "var(--accent)" }}>
            <span className="lk">Surface totale</span>
            <div className="lv">{surfaceTotale.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>ha</small></div>
          </div>
          <div className="li" style={{ borderLeftColor: "var(--wood)" }}>
            <span className="lk">m³ produits</span>
            <div className="lv">{volumeTotal.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div>
          </div>
        </div>
      )}

      <section>
        <div className="dash-carnet-head">
          <h2>Journal des chantiers</h2>
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
          <div className="dash-carnet">
            {recents.map((c, i) => (
              <Link key={c.id} href={`/chantiers/${c.id}`} className="dash-row">
                <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="nom">{c.nom}</span>
                <span className="meta">
                  <span>{c.commune || "Commune ?"}</span>
                  {c.surfaceHa != null && <>·<span>{formatSurface(c.surfaceHa)}</span></>}
                  {c.essence && <>·<span>{c.essence}</span></>}
                </span>
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
