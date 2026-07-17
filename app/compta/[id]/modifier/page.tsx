"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFinance } from "@/lib/queries/finances";
import FinanceForm from "@/components/FinanceForm";
import { IcBack } from "@/lib/icons";

export default function ModifierEcriture() {
  const { id } = useParams<{ id: string }>();
  const { data: f } = useFinance(id);

  if (f === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (f === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Écriture introuvable</h3>
        <Link href="/compta" className="btn primary">Retour à la comptabilité</Link>
      </div>
    );
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/compta" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Comptabilité</Link>
          <p className="eyebrow">Modifier</p>
          <h1>Écriture</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <FinanceForm initial={f} />
      </div>
    </div>
  );
}
