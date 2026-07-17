"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFacture } from "@/lib/queries/factures";
import FactureForm from "@/components/FactureForm";
import { IcBack } from "@/lib/icons";

export default function ModifierFacture() {
  const { id } = useParams<{ id: string }>();
  const { data: doc } = useFacture(id);

  if (doc === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (doc === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Document introuvable</h3>
        <Link href="/factures" className="btn primary">Retour aux factures</Link>
      </div>
    );
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href={`/factures/${id}`} className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Retour au document</Link>
          <p className="eyebrow">Modifier</p>
          <h1>{doc.type === "devis" ? "Devis" : "Facture"} {doc.numero}</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 900 }}>
        <FactureForm initial={doc} />
      </div>
    </div>
  );
}
