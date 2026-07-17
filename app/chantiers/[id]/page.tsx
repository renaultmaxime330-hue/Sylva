"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { totalVolume, type Chantier } from "@/lib/db";
import { supprimerChantier, marquerTermine } from "@/lib/chantiers";
import { useChantier } from "@/lib/queries/chantiers";
import StatutPill from "@/components/StatutPill";
import VolumesChantier from "@/components/VolumesChantier";
import MapChantier from "@/components/MapChantier";
import { formatDate, formatSurface, formatGPS } from "@/lib/format";
import { IcBack, IcEdit, IcTrash, IcChart, IcCheck } from "@/lib/icons";

type Tab = "infos" | "carte" | "volumes";

export default function FicheChantier() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("infos");

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
          <Link href={`/chantiers/${id}/modifier`} className="btn big"><IcEdit /> Modifier</Link>
          <button className="btn danger big" onClick={onSupprimer}><IcTrash /> Supprimer</button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "infos" ? "on" : ""} onClick={() => setTab("infos")}>Infos</button>
        <button className={tab === "carte" ? "on" : ""} onClick={() => setTab("carte")}>Carte</button>
        <button className={tab === "volumes" ? "on" : ""} onClick={() => setTab("volumes")}>Volumes</button>
      </div>

      {tab === "infos" && <OngletInfos chantier={chantier} />}
      {tab === "carte" && <MapChantier chantier={chantier} readOnly editHref={`/carte?c=${id}`} />}
      {tab === "volumes" && <OngletVolumes chantier={chantier} />}
    </div>
  );
}

/* ---------- Onglet Infos ---------- */
function OngletInfos({ chantier: c }: { chantier: Chantier }) {
  const cells: { k: string; v: string; mono?: boolean }[] = [
    { k: "Propriétaire", v: c.proprietaire || "—" },
    { k: "Client", v: c.client || "—" },
    { k: "Parcelle", v: c.numParcelle || "—" },
    { k: "Commune", v: c.commune || "—" },
    { k: "Coordonnées GPS", v: formatGPS(c.lat, c.lng), mono: true },
    { k: "Surface", v: formatSurface(c.surfaceHa) },
    { k: "Peuplement", v: c.typePeuplement || "—" },
    { k: "Essence", v: c.essence || "—" },
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
            <span className={"v" + (cell.mono ? " mono" : "")}>{cell.v}</span>
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
