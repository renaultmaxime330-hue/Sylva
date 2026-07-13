"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import EnginForm from "@/components/EnginForm";
import { IcBack } from "@/lib/icons";

export default function ModifierEngin() {
  const { id } = useParams<{ id: string }>();
  const engin = useLiveQuery(() => db.engins.get(id).then((e) => e ?? null), [id]);

  if (engin === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (engin === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Engin introuvable</h3>
        <Link href="/engins" className="btn primary">Retour aux engins</Link>
      </div>
    );
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href={`/engins/${id}`} className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Retour à la fiche
          </Link>
          <p className="eyebrow">Modifier</p>
          <h1>{engin.nom}</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <EnginForm initial={engin} />
      </div>
    </div>
  );
}
