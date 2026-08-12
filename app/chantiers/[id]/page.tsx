"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { totalVolume, type Chantier } from "@/lib/db";
import { supprimerChantier, marquerTermine } from "@/lib/chantiers";
import { useChantier } from "@/lib/queries/chantiers";
import { useDossiers } from "@/lib/queries/dossiers";
import { useFinances } from "@/lib/queries/finances";
import { useMonEquipe } from "@/lib/queries/equipe";
import { bilan, supprimerFinance } from "@/lib/finances";
import StatutPill from "@/components/StatutPill";
import VolumesChantier from "@/components/VolumesChantier";
import MapChantier from "@/components/MapChantier";
import { formatDate, formatSurface, lienGoogleMaps } from "@/lib/format";
import { IcBack, IcEdit, IcTrash, IcChart, IcCheck, IcClock, IcEuro, IcPlus, IcPin } from "@/lib/icons";

type Tab = "infos" | "carte" | "volumes" | "finances";

export default function FicheChantier() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("infos");
  const { data: equipe } = useMonEquipe();
  const estChef = equipe?.monChefEntreprise ?? false;

  const { data: chantier } = useChantier(id);

  if (chantier === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (chantier === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Chantier introuvable</h3>
        <p>Ce chantier a peut-être été supprimé.</p>
        <Link href="/chantiers" className="btn primary">Retour aux chantiers</Link>
      </div>
    );
  }

  async function onSupprimer() {
    if (!confirm(`Supprimer le chantier « ${chantier!.nom} » ?\nCette action supprime aussi ses tracés de carte.`)) return;
    await supprimerChantier(id);
    router.push("/chantiers");
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/chantiers" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Chantiers
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1>{chantier.nom}</h1>
            <StatutPill statut={chantier.statut} />
          </div>
          <p className="sub">
            {chantier.proprietaire || "Propriétaire ?"}
            {chantier.commune && ` · ${chantier.commune}`}
          </p>
        </div>
        <div className="actions">
          <Link href={`/production/nouvelle?c=${id}`} className="btn primary big"><IcClock /> Saisir une journée</Link>
          <Link href={`/chantiers/${id}/modifier`} className="btn big"><IcEdit /> Modifier</Link>
          <button className="btn danger big" onClick={onSupprimer}><IcTrash /> Supprimer</button>
        </div>
      </div>

      <div className="terrain-plaque">
        <span className="terrain-tag">{chantier.numParcelle || "—"}</span>
        <div className="tp-item"><span className="k">Surface</span><span className="v">{formatSurface(chantier.surfaceHa)}</span></div>
        <div className="tp-sep" />
        <div className="tp-item"><span className="k">Essence</span><span className="v">{chantier.essence || "—"}</span></div>
        <div className="tp-sep" />
        <div className="tp-item"><span className="k">Peuplement</span><span className="v">{chantier.typePeuplement || "—"}</span></div>
      </div>

      <div className="tabs">
        <button className={tab === "infos" ? "on" : ""} onClick={() => setTab("infos")}>Infos</button>
        <button className={tab === "carte" ? "on" : ""} onClick={() => setTab("carte")}>Carte</button>
        <button className={tab === "volumes" ? "on" : ""} onClick={() => setTab("volumes")}>Volumes</button>
        {estChef && <button className={tab === "finances" ? "on" : ""} onClick={() => setTab("finances")}>Finances</button>}
      </div>

      {tab === "infos" && <OngletInfos chantier={chantier} />}
      {tab === "carte" && <MapChantier chantier={chantier} readOnly editHref={`/carte?c=${id}`} />}
      {tab === "volumes" && <OngletVolumes chantier={chantier} />}
      {tab === "finances" && estChef && <OngletFinances chantier={chantier} />}
    </div>
  );
}

/* ---------- Onglet Infos ---------- */
function OngletInfos({ chantier: c }: { chantier: Chantier }) {
  const { data: dossiers } = useDossiers();
  const dossier = dossiers?.find((d) => d.id === c.dossierId);
  const maps = lienGoogleMaps(c.lat, c.lng);
  const cells: { k: string; v: string; mono?: boolean; lien?: string }[] = [
    { k: "Dossier", v: dossier?.nom ?? "—" },
    { k: "Propriétaire", v: c.proprietaire || "—" },
    { k: "Client", v: c.client || "—" },
    { k: "Commune", v: c.commune || "—" },
    { k: "Position", v: maps ? "Ouvrir dans Google Maps" : "—", lien: maps ?? undefined },
    { k: "Date de début", v: formatDate(c.dateDebut) },
    { k: "Date de fin", v: formatDate(c.dateFin) },
  ];
  const vol = totalVolume(c);
  cells.push({
    k: "Volume total produit",
    v: vol > 0 ? `${vol.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m³` : "—",
  });
  return (
    <div className="stack-gap">
      <div className="info-grid">
        {cells.map((cell) => (
          <div className="info-cell" key={cell.k}>
            <span className="k">{cell.k}</span>
            {cell.lien ? (
              <a className="v lien-maps" href={cell.lien} target="_blank" rel="noopener noreferrer">
                <IcPin /> {cell.v}
              </a>
            ) : (
              <span className={"v" + (cell.mono ? " mono" : "")}>{cell.v}</span>
            )}
          </div>
        ))}
      </div>
      {c.notes && (
        <div className="card pad">
          <span className="k" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", fontWeight: 700 }}>Notes</span>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{c.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Onglet Volumes ---------- */
function OngletVolumes({ chantier }: { chantier: Chantier }) {
  if (chantier.statut !== "termine") {
    return (
      <div className="card pad empty">
        <div className="ic"><IcChart /></div>
        <h3>Volumes disponibles une fois le chantier terminé</h3>
        <p>Tu pourras saisir le volume produit par catégorie (bois d'œuvre, trituration, bois énergie…) dès que le chantier est marqué comme terminé.</p>
        <button className="btn primary big" onClick={() => marquerTermine(chantier.id)}>
          <IcCheck /> Marquer comme terminé
        </button>
      </div>
    );
  }
  return <VolumesChantier chantier={chantier} />;
}

/* ---------- Onglet Finances (rentabilité, chef d'entreprise uniquement) ---------- */
const eur = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

function OngletFinances({ chantier }: { chantier: Chantier }) {
  const { data: finances } = useFinances();
  if (!finances) return <div className="muted" style={{ padding: 20 }}>Chargement…</div>;

  const lignes = finances.filter((f) => f.chantierId === chantier.id);
  const b = bilan(lignes);

  return (
    <div className="stack-gap">
      <div className="stats">
        <div className="stat"><div className="k" style={{ color: "var(--st-done)" }}>Recettes</div><div className="v" style={{ color: "var(--st-done)" }}>{eur(b.recettes)}</div></div>
        <div className="stat"><div className="k" style={{ color: "var(--danger)" }}>Dépenses</div><div className="v" style={{ color: "var(--danger)" }}>{eur(b.depenses)}</div></div>
        <div className="stat"><div className="k"><IcEuro /> Marge</div><div className="v" style={{ color: b.marge >= 0 ? "var(--accent-strong)" : "var(--danger)" }}>{eur(b.marge)}</div></div>
        <div className="stat"><div className="k">Rentabilité</div><div className="v">{b.rentabilite != null ? b.rentabilite.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—"}<small>%</small></div></div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href={`/compta/nouvelle?c=${chantier.id}`} className="btn primary"><IcPlus /> Nouvelle écriture</Link>
      </div>

      {lignes.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcEuro /></div>
          <h3>Aucune écriture sur ce chantier</h3>
          <p>Ajoute les recettes (ventes de bois…) et dépenses rattachées à ce chantier pour suivre sa rentabilité.</p>
        </div>
      ) : (
        <div className="list">
          {lignes.map((f) => (
            <div className="jrow" key={f.id}>
              <div className="fin-amt" style={{ color: f.type === "recette" ? "var(--st-done)" : "var(--danger)" }}>
                {f.type === "recette" ? "+" : "−"}{eur(f.montant)}
              </div>
              <div className="jbody">
                <div className="t">{f.libelle || f.categorie || (f.type === "recette" ? "Recette" : "Dépense")}</div>
                <div className="m muted">
                  {f.categorie && <span>{f.categorie}</span>}
                  <span>{formatDate(f.date)}</span>
                </div>
              </div>
              <div className="jactions">
                <Link href={`/compta/${f.id}/modifier`} className="iconbtn" aria-label="Modifier"><IcEdit /></Link>
                <button className="iconbtn" aria-label="Supprimer" onClick={() => { if (confirm("Supprimer cette écriture ?")) supprimerFinance(f.id); }}><IcTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
