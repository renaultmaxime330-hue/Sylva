"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useChantier } from "@/lib/queries/chantiers";
import ChantierForm from "@/components/ChantierForm";
import { IcBack } from "@/lib/icons";

export default function ModifierChantier() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: chantier } = useChantier(id);

  if (chantier === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (chantier === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Chantier introuvable</h3>
        <Link href="/chantiers" className="btn primary">Retour aux chantiers</Link>
      </div>
    );
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href={`/chantiers/${id}`} className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Retour à la fiche
          </Link>
          <p className="eyebrow">Modifier</p>
          <h1>{chantier.nom}</h1>
        </div>
      </div>

      <div className="card pad" style={{ maxWidth: 780 }}>
        <ChantierForm initial={chantier} />
      </div>
    </div>
  );
}
