"use client";

import Link from "next/link";
import { enginTypeLabel } from "@/lib/db";
import { alerteEntretien } from "@/lib/engins";
import { useEngins, useEntretiens } from "@/lib/queries/engins";
import { IcTruck, IcPlus, IcChevron, IcCheck, IcWarning } from "@/lib/icons";

export default function EnginsPage() {
  const { data: engins } = useEngins();
  const { data: entretiens } = useEntretiens();

  if (!engins || !entretiens) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const nbAlertes = engins.filter((e) => {
    const a = alerteEntretien(e, entretiens.filter((x) => x.enginId === e.id));
    return a.niveau === "depasse" || a.niveau === "bientot";
  }).length;

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Engins</p>
          <h1>Mes machines</h1>
          <p className="sub">
            {engins.length} engin{engins.length > 1 ? "s" : ""}
            {nbAlertes > 0 && <> · <span style={{ color: "var(--danger)", fontWeight: 700 }}>{nbAlertes} entretien{nbAlertes > 1 ? "s" : ""} à prévoir</span></>}
          </p>
        </div>
        <div className="actions">
          <Link href="/engins/nouveau" className="btn primary big"><IcPlus /> Nouvel engin</Link>
        </div>
      </div>

      {engins.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcTruck /></div>
          <h3>Aucun engin</h3>
          <p>Ajoute tes machines (tronçonneuse, abatteuse, débardeur, tracteur…) pour suivre leurs heures et leurs entretiens.</p>
          <Link href="/engins/nouveau" className="btn primary big"><IcPlus /> Ajouter un engin</Link>
        </div>
      ) : (
        <div className="tech-list">
          {engins.map((e) => {
            const a = alerteEntretien(e, entretiens.filter((x) => x.enginId === e.id));
            const pct = a.niveau !== "aucun" && e.seuilEntretienH
              ? Math.max(0, Math.min(100, ((a.heuresDepuis ?? 0) / e.seuilEntretienH) * 100))
              : null;
            return (
              <Link key={e.id} href={`/engins/${e.id}`} className="tech-row" data-actif={e.actif}>
                <div className="tech-meter">
                  <div className="hv">{e.heuresTotal != null ? e.heuresTotal.toLocaleString("fr-FR") : "—"}</div>
                  <div className="hu">heures</div>
                </div>
                <div className="tech-body">
                  <div className="t">{e.nom} {!e.actif && <span className="muted" style={{ fontWeight: 500 }}>· hors service</span>}</div>
                  <div className="m">
                    <span className="tech-type">{enginTypeLabel(e.type)}</span>
                    {e.marque && <span className="tech-marque">{e.marque}{e.modele ? ` ${e.modele}` : ""}</span>}
                  </div>
                </div>
                {pct != null && (
                  <div className="tech-gauge" data-niv={a.niveau}>
                    <div className="gh">
                      <span>Entretien</span>
                      <b>{a.niveau === "depasse" ? <><IcWarning /> dépassé</> : a.niveau === "bientot" ? <><IcWarning /> {a.reste} h</> : <><IcCheck /> à jour</>}</b>
                    </div>
                    <div className="gbar"><div style={{ width: `${pct}%` }} /></div>
                  </div>
                )}
                <span className="tech-chev"><IcChevron /></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
