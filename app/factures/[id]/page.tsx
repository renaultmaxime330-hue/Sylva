"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DOC_STATUTS, type DocStatut } from "@/lib/db";
import { useFacture } from "@/lib/queries/factures";
import { useChantier } from "@/lib/queries/chantiers";
import { totauxDoc, totalLigne, statutDocInfo, changerStatutFacture, supprimerFacture } from "@/lib/facturation";
import { getEntreprise } from "@/lib/entreprise";
import { formatDate } from "@/lib/format";
import { IcBack, IcEdit, IcTrash, IcReceipt, IcPrint } from "@/lib/icons";

const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function FicheFacture() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: doc } = useFacture(id);
  const { data: chantier } = useChantier(doc?.chantierId ?? "");

  if (doc === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (doc === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcReceipt /></div>
        <h3>Document introuvable</h3>
        <Link href="/factures" className="btn primary">Retour aux factures</Link>
      </div>
    );
  }

  const ent = getEntreprise();
  const t = totauxDoc(doc);
  const s = statutDocInfo(doc.statut);
  const titre = doc.type === "devis" ? "Devis" : "Facture";
  const entrepriseVide = !ent.nom.trim();

  async function onSupprimer() {
    if (!confirm(`Supprimer ${titre.toLowerCase()} ${doc!.numero} ?`)) return;
    await supprimerFacture(id);
    router.push("/factures");
  }

  return (
    <div className="stack-gap">
      <div className="page-head no-print">
        <div className="titles">
          <Link href="/factures" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Devis &amp; Factures</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1>{titre} {doc.numero}</h1>
            <span className={`pill ${s.cls}`}>{s.label}</span>
          </div>
          <p className="sub">{doc.clientNom} · {formatDate(doc.date)}</p>
        </div>
        <div className="actions">
          <button className="btn primary big" onClick={() => window.print()}><IcPrint /> Imprimer / PDF</button>
          <Link href={`/factures/${id}/modifier`} className="btn big"><IcEdit /> Modifier</Link>
          <button className="btn danger big" onClick={onSupprimer}><IcTrash /> Supprimer</button>
        </div>
      </div>

      {/* Changement de statut */}
      <div className="toolbar no-print">
        <span className="muted" style={{ alignSelf: "center", fontSize: 14, fontWeight: 600 }}>Statut :</span>
        <div className="filters">
          {DOC_STATUTS.map((st) => (
            <button key={st.value} className="chip-btn" data-on={doc.statut === st.value} onClick={() => changerStatutFacture(id, st.value as DocStatut)}>{st.label}</button>
          ))}
        </div>
      </div>

      {entrepriseVide && (
        <div className="banner no-print" style={{ background: "var(--wood-soft)", color: "var(--wood)", borderColor: "var(--wood)" }}>
          Renseigne les coordonnées de ton entreprise dans <Link href="/reglages" style={{ textDecoration: "underline", color: "inherit" }}>Réglages</Link> pour qu'elles apparaissent sur le document.
        </div>
      )}

      {/* Document imprimable */}
      <div className="report card pad doc-sheet">
        <div className="report-head" style={{ alignItems: "flex-start" }}>
          <div className="report-brand" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IcReceipt /> {ent.nom || "Mon entreprise"}</span>
            {(ent.adresse || ent.siret || ent.telephone) && (
              <span className="muted" style={{ fontSize: 13, fontWeight: 500, whiteSpace: "pre-line" }}>
                {[ent.adresse, ent.telephone, ent.email, ent.siret && `SIRET ${ent.siret}`].filter(Boolean).join("\n")}
              </span>
            )}
          </div>
          <div className="doc-num" style={{ flex: 1 }}>
            <div className="big">{titre}</div>
            <div className="muted">N° {doc.numero}</div>
            <div className="muted">Date : {formatDate(doc.date)}</div>
            {doc.dateEcheance && <div className="muted">{doc.type === "devis" ? "Valable jusqu'au" : "Échéance"} : {formatDate(doc.dateEcheance)}</div>}
          </div>
        </div>

        <div className="doc-parties">
          <div>
            <h4>Client</h4>
            <div className="who">{doc.clientNom}</div>
            {doc.clientAdresse && <div className="lines">{doc.clientAdresse}</div>}
          </div>
          {chantier && (
            <div>
              <h4>Chantier</h4>
              <div className="who">{chantier.nom}</div>
              {chantier.commune && <div className="lines">{chantier.commune}</div>}
            </div>
          )}
        </div>

        <div className="tablewrap" style={{ boxShadow: "none" }}>
          <table>
            <thead><tr><th>Désignation</th><th style={{ textAlign: "right" }}>Qté</th><th>Unité</th><th style={{ textAlign: "right" }}>P.U. HT</th><th style={{ textAlign: "right" }}>Total HT</th></tr></thead>
            <tbody>
              {doc.lignes.map((l, i) => (
                <tr key={i}>
                  <td>{l.designation || "—"}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{l.quantite.toLocaleString("fr-FR")}</td>
                  <td>{l.unite}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{eur(l.prixUnitaire)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{eur(totalLigne(l))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totaux" style={{ marginTop: 18 }}>
          <div style={{ maxWidth: 340, color: "var(--text-muted)", fontSize: 13 }}>
            {doc.notes && <p style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>{doc.notes}</p>}
            {doc.tva === 0 && ent.mentionTVA && <p>{ent.mentionTVA}</p>}
          </div>
          <div className="totaux-lignes">
            <div><span>Total HT</span><b>{eur(t.ht)}</b></div>
            <div><span>TVA ({doc.tva} %)</span><b>{eur(t.tvaMontant)}</b></div>
            <div className="ttc"><span>Total TTC</span><b>{eur(t.ttc)}</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
