"use client";

import Link from "next/link";
import { useState } from "react";
import type { DocType } from "@/lib/db";
import { useFactures } from "@/lib/queries/factures";
import { totauxDoc, statutDocInfo } from "@/lib/facturation";
import { formatDate } from "@/lib/format";
import { IcReceipt, IcPlus } from "@/lib/icons";

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
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Type</th>
                <th>Client</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Lignes</th>
                <th style={{ textAlign: "right" }}>Montant TTC</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtres.map((d) => {
                const t = totauxDoc(d);
                const s = statutDocInfo(d.statut);
                return (
                  <tr key={d.id}>
                    <td><Link href={`/factures/${d.id}`} className="doc-num-link">{d.numero}</Link></td>
                    <td className="doc-type-tag">{d.type === "devis" ? "Devis" : "Facture"}</td>
                    <td>{d.clientNom}</td>
                    <td>{formatDate(d.date)}</td>
                    <td style={{ textAlign: "right" }}>{d.lignes.length}</td>
                    <td style={{ textAlign: "right" }}><span className="doc-ttc">{eur(t.ttc)}</span></td>
                    <td><span className={`pill ${s.cls} sm`}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
