"use client";

import Link from "next/link";
import { useState } from "react";
import type { DocType } from "@/lib/db";
import { useFactures } from "@/lib/queries/factures";
import { totauxDoc, statutDocInfo } from "@/lib/facturation";
import { formatDate } from "@/lib/format";
import { IcReceipt, IcPlus, IcChevron } from "@/lib/icons";

const eur = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " €";

export default function FacturesPage() {
  const [filtre, setFiltre] = useState<"tous" | DocType>("tous");
  const { data: docs } = useFactures();

  if (!docs) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const filtres = filtre === "tous" ? docs : docs.filter((d) => d.type === filtre);

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Devis &amp; Factures</p>
          <h1>Devis &amp; factures</h1>
          <p className="sub">{docs.length} document{docs.length > 1 ? "s" : ""}.</p>
        </div>
        <div className="actions">
          <Link href="/factures/nouveau?type=devis" className="btn big"><IcPlus /> Devis</Link>
          <Link href="/factures/nouveau?type=facture" className="btn primary big"><IcPlus /> Facture</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="filters">
          <button className="chip-btn" data-on={filtre === "tous"} onClick={() => setFiltre("tous")}>Tous</button>
          <button className="chip-btn" data-on={filtre === "devis"} onClick={() => setFiltre("devis")}>Devis</button>
          <button className="chip-btn" data-on={filtre === "facture"} onClick={() => setFiltre("facture")}>Factures</button>
        </div>
      </div>

      {filtres.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcReceipt /></div>
          <h3>Aucun document</h3>
          <p>Crée ton premier devis ou ta première facture — ils sont imprimables en PDF.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/factures/nouveau?type=devis" className="btn big"><IcPlus /> Nouveau devis</Link>
            <Link href="/factures/nouveau?type=facture" className="btn primary big"><IcPlus /> Nouvelle facture</Link>
          </div>
        </div>
      ) : (
        <div className="list">
          {filtres.map((d) => {
            const t = totauxDoc(d);
            const s = statutDocInfo(d.statut);
            return (
              <Link key={d.id} href={`/factures/${d.id}`} className="row-card">
                <div className="glyph"><IcReceipt /></div>
                <div className="body">
                  <div className="t">{d.type === "devis" ? "Devis" : "Facture"} {d.numero} <span className="muted" style={{ fontWeight: 500 }}>· {d.clientNom}</span></div>
                  <div className="m">
                    <span>{formatDate(d.date)}</span>·<span>{d.lignes.length} ligne{d.lignes.length > 1 ? "s" : ""}</span>·<span style={{ fontWeight: 700, color: "var(--accent-strong)" }}>{eur(t.ttc)} TTC</span>
                  </div>
                </div>
                <span className={`pill ${s.cls} sm`}>{s.label}</span>
                <span className="chev"><IcChevron /></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
