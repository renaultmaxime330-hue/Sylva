"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useClient } from "@/lib/queries/clients";
import ClientForm from "@/components/ClientForm";
import { IcBack } from "@/lib/icons";

export default function ModifierClient() {
  const { id } = useParams<{ id: string }>();
  const { data: client } = useClient(id);

  if (client === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (client === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Client introuvable</h3>
        <Link href="/clients" className="btn primary">Retour aux clients</Link>
      </div>
    );
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href={`/clients/${id}`} className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Retour à la fiche</Link>
          <p className="eyebrow">Modifier</p>
          <h1>{client.nom}</h1>
        </div>
      </div>
      <div className="card pad" style={{ maxWidth: 780 }}>
        <ClientForm initial={client} />
      </div>
    </div>
  );
}
