"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import FactureForm from "@/components/FactureForm";
import { prochainNumero } from "@/lib/facturation";
import type { DocType } from "@/lib/db";
import { IcBack } from "@/lib/icons";

function Contenu() {
  const sp = useSearchParams();
  const type: DocType = sp.get("type") === "facture" ? "facture" : "devis";
  const [numero, setNumero] = useState<string | null>(null);
  useEffect(() => { prochainNumero(type).then(setNumero); }, [type]);

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/factures" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Devis &amp; Factures</Link>
          <p className="eyebrow">Nouveau</p>
          <h1>Nouveau {type === "devis" ? "devis" : "facture"}</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 900 }}>
        {numero === null ? <div className="muted">Préparation…</div> : <FactureForm type={type} numero={numero} />}
      </div>
    </div>
  );
}

export default function NouvelleFacture() {
  return (
    <Suspense fallback={<div className="muted" style={{ padding: 40 }}>Chargement…</div>}>
      <Contenu />
    </Suspense>
  );
}
