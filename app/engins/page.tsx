"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, enginTypeLabel } from "@/lib/db";
import { amorcerDemoEngins, alerteEntretien } from "@/lib/engins";
import { IcTruck, IcPlus, IcChevron, IcCheck, IcWarning } from "@/lib/icons";

export default function EnginsPage() {
  useEffect(() => { amorcerDemoEngins(); }, []);

  const engins = useLiveQuery(() => db.engins.orderBy("updatedAt").reverse().toArray(), []);
  const entretiens = useLiveQuery(() => db.entretiens.toArray(), []);

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
        <div className="list">
          {engins.map((e) => {
            const a = alerteEntretien(e, entretiens.filter((x) => x.enginId === e.id));
            return (
              <Link key={e.id} href={`/engins/${e.id}`} className="row-card">
                <div className="glyph"><IcTruck /></div>
                <div className="body">
                  <div className="t">{e.nom} {!e.actif && <span className="muted" style={{ fontWeight: 500 }}>· hors service</span>}</div>
                  <div className="m">
                    <span>{enginTypeLabel(e.type)}</span>
                    {e.marque && <>·<span>{e.marque}</span></>}
                    {e.heuresTotal != null && <>·<span>{e.heuresTotal.toLocaleString("fr-FR")} h</span></>}
                  </div>
                </div>
                {a.niveau === "depasse" && <span className="pill sm" style={{ color: "var(--danger)", background: "var(--danger-bg)" }}><IcWarning /> Entretien dépassé</span>}
                {a.niveau === "bientot" && <span className="pill doing sm"><IcWarning /> Entretien dans {a.reste} h</span>}
                {a.niveau === "ok" && <span className="pill done sm"><IcCheck /> À jour</span>}
                <span className="chev"><IcChevron /></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
