"use client";

import Link from "next/link";
import { useState } from "react";
import { chantiersDeClient } from "@/lib/clients";
import { useClients } from "@/lib/queries/clients";
import { useChantiers } from "@/lib/queries/chantiers";
import { IcUsers, IcPlus, IcChevron, IcSearch, IcSite } from "@/lib/icons";

export default function ClientsPage() {
  const [q, setQ] = useState("");

  const { data: clients } = useClients();
  const { data: chantiers } = useChantiers();

  if (!clients || !chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const ql = q.trim().toLowerCase();
  const filtres = clients.filter((c) => !ql || [c.nom, c.commune, c.telephone, c.email].join(" ").toLowerCase().includes(ql));

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Clients</p>
          <h1>Clients &amp; propriétaires</h1>
          <p className="sub">{clients.length} client{clients.length > 1 ? "s" : ""} au total.</p>
        </div>
        <div className="actions">
          <Link href="/clients/nouveau" className="btn primary big"><IcPlus /> Nouveau client</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <IcSearch />
          <input className="input" placeholder="Rechercher un client, commune, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {filtres.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcUsers /></div>
          <h3>{clients.length === 0 ? "Aucun client" : "Aucun résultat"}</h3>
          <p>{clients.length === 0 ? "Crée une fiche pour chaque propriétaire / donneur d'ordre." : "Aucun client ne correspond à ta recherche."}</p>
          {clients.length === 0 && <Link href="/clients/nouveau" className="btn primary big"><IcPlus /> Créer un client</Link>}
        </div>
      ) : (
        <div className="list">
          {filtres.map((c) => {
            const nb = chantiersDeClient(c, chantiers).length;
            return (
              <Link key={c.id} href={`/clients/${c.id}`} className="row-card">
                <div className="glyph"><IcUsers /></div>
                <div className="body">
                  <div className="t">{c.nom}</div>
                  <div className="m">
                    {c.commune && <span>{c.commune}</span>}
                    {c.telephone && <>·<span>{c.telephone}</span></>}
                    <>·<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IcSite style={{ width: 13, height: 13 }} /> {nb} chantier{nb > 1 ? "s" : ""}</span></>
                  </div>
                </div>
                <span className="chev"><IcChevron /></span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
