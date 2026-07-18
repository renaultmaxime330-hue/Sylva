"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supprimerClient, chantiersDeClient } from "@/lib/clients";
import { useClient } from "@/lib/queries/clients";
import { useChantiers } from "@/lib/queries/chantiers";
import { useJournees } from "@/lib/queries/journees";
import { useFinances } from "@/lib/queries/finances";
import { bilan } from "@/lib/finances";
import StatutPill from "@/components/StatutPill";
import { IcBack, IcEdit, IcTrash, IcUsers, IcChevron, IcSite, IcChart, IcEuro } from "@/lib/icons";

const eur = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

export default function FicheClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: client } = useClient(id);
  const { data: chantiers } = useChantiers();
  const { data: journees } = useJournees();
  const { data: finances } = useFinances();

  if (client === undefined || !chantiers || !journees || !finances) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (client === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcUsers /></div>
        <h3>Client introuvable</h3>
        <Link href="/clients" className="btn primary">Retour aux clients</Link>
      </div>
    );
  }

  const mesChantiers = chantiersDeClient(client, chantiers);
  const ids = new Set(mesChantiers.map((c) => c.id));
  const volume = journees.filter((j) => ids.has(j.chantierId)).reduce((s, j) => s + (j.volumeM3 ?? 0), 0);
  const b = bilan(finances.filter((f) => f.chantierId && ids.has(f.chantierId)));

  async function onSupprimer() {
    if (!confirm(`Supprimer la fiche de « ${client!.nom} » ?\n(Les chantiers ne sont pas supprimés.)`)) return;
    await supprimerClient(id);
    router.push("/clients");
  }

  const cells = [
    { k: "Téléphone", v: client.telephone || "—" },
    { k: "E-mail", v: client.email || "—" },
    { k: "Adresse", v: client.adresse || "—" },
    { k: "Commune", v: client.commune || "—" },
  ];

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/clients" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Clients</Link>
          <h1>{client.nom}</h1>
          <p className="sub">{mesChantiers.length} chantier{mesChantiers.length > 1 ? "s" : ""}{client.commune ? ` · ${client.commune}` : ""}</p>
        </div>
        <div className="actions">
          <Link href={`/clients/${id}/modifier`} className="btn big"><IcEdit /> Modifier</Link>
          <button className="btn danger big" onClick={onSupprimer}><IcTrash /> Supprimer</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="k"><IcSite /> Chantiers</div><div className="v">{mesChantiers.length}</div></div>
        <div className="stat"><div className="k"><IcChart /> Volume total</div><div className="v">{volume.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div></div>
        <div className="stat"><div className="k"><IcEuro /> Recettes</div><div className="v" style={{ color: "var(--st-done)" }}>{eur(b.recettes)}</div></div>
        <div className="stat"><div className="k"><IcEuro /> Marge</div><div className="v" style={{ color: b.marge >= 0 ? "var(--accent-strong)" : "var(--danger)" }}>{eur(b.marge)}</div></div>
      </div>

      <div className="info-grid">
        {cells.map((c) => (
          <div className="info-cell" key={c.k}><span className="k">{c.k}</span><span className="v">{c.v}</span></div>
        ))}
      </div>

      {client.notes && (
        <div className="card pad">
          <span className="k" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", fontWeight: 700 }}>Notes</span>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{client.notes}</p>
        </div>
      )}

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 14 }}>Historique des chantiers</h2>
        {mesChantiers.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>Aucun chantier rattaché. Les chantiers dont le propriétaire correspond à « {client.nom} » apparaîtront ici.</p>
        ) : (
          <div className="list">
            {mesChantiers.map((c) => (
              <Link key={c.id} href={`/chantiers/${c.id}`} className="row-card">
                <div className="glyph"><IcSite /></div>
                <div className="body">
                  <div className="t">{c.nom}</div>
                  <div className="m">
                    {c.commune && <span>{c.commune}</span>}
                    {c.surfaceHa != null && <>·<span>{c.surfaceHa.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha</span></>}
                  </div>
                </div>
                <StatutPill statut={c.statut} sm />
                <span className="chev"><IcChevron /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
