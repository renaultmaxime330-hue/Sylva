"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import JourneeForm from "@/components/JourneeForm";
import { IcBack } from "@/lib/icons";

export default function ModifierJournee() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const journee = useLiveQuery(() => db.journees.get(id).then((j) => j ?? null), [id]);

  if (journee === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (journee === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Journée introuvable</h3>
        <Link href="/production" className="btn primary">Retour à la production</Link>
      </div>
    );
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/production" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Production
          </Link>
          <p className="eyebrow">Modifier</p>
          <h1>Journée du {new Date(journee.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 820 }}>
        <JourneeForm initial={journee} />
      </div>
    </div>
  );
}
