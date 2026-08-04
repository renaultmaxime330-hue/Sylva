"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import FinanceForm from "@/components/FinanceForm";
import { IcBack } from "@/lib/icons";

export default function NouvelleEcriture() {
  const searchParams = useSearchParams();
  const chantierId = searchParams.get("c") ?? undefined;
  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/compta" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Comptabilité</Link>
          <p className="eyebrow">Nouvelle écriture</p>
          <h1>Ajouter une recette / dépense</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <FinanceForm chantierId={chantierId} />
      </div>
    </div>
  );
}
