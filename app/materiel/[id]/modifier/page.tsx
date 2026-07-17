"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMaterielUn } from "@/lib/queries/materiel";
import MaterielForm from "@/components/MaterielForm";
import { IcBack } from "@/lib/icons";

export default function ModifierMateriel() {
  const { id } = useParams<{ id: string }>();
  const { data: m } = useMaterielUn(id);

  if (m === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (m === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Article introuvable</h3>
        <Link href="/materiel" className="btn primary">Retour au matériel</Link>
      </div>
    );
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/materiel" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Matériel</Link>
          <p className="eyebrow">Modifier</p>
          <h1>{m.nom}</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <MaterielForm initial={m} />
      </div>
    </div>
  );
}
