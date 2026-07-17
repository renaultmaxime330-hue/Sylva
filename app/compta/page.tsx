"use client";

import Link from "next/link";
import { useState } from "react";
import { bilan, supprimerFinance } from "@/lib/finances";
import { useFinances } from "@/lib/queries/finances";
import { useChantiers } from "@/lib/queries/chantiers";
import { formatDate } from "@/lib/format";
import { IcEuro, IcPlus, IcEdit, IcTrash, IcSite } from "@/lib/icons";

const eur = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

export default function ComptaPage() {
  const [filtre, setFiltre] = useState<string>("tous");

  const { data: finances } = useFinances();
  const { data: chantiers } = useChantiers();

  if (!finances || !chantiers) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const nomChantier = (id?: string) => (id ? chantiers.find((c) => c.id === id)?.nom ?? "Chantier" : "Frais généraux");
  const filtrees = filtre === "tous" ? finances : finances.filter((f) => f.chantierId === filtre);
  const b = bilan(filtrees);

  const chantiersAvecFinances = chantiers.filter((c) => finances.some((f) => f.chantierId === c.id));

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Comptabilité</p>
          <h1>Recettes &amp; dépenses</h1>
          <p className="sub">Suis tes recettes, tes coûts et ta marge par chantier.</p>
        </div>
        <div className="actions">
          <Link href="/compta/nouvelle" className="btn primary big"><IcPlus /> Nouvelle écriture</Link>
        </div>
      </div>

      <div className="toolbar">
        <div className="filters">
          <button className="chip-btn" data-on={filtre === "tous"} onClick={() => setFiltre("tous")}>Tout</button>
          {chantiersAvecFinances.map((c) => (
            <button key={c.id} className="chip-btn" data-on={filtre === c.id} onClick={() => setFiltre(c.id)}>{c.nom}</button>
          ))}
        </div>
      </div>

      {/* Bilan */}
      <div className="stats">
        <div className="stat"><div className="k" style={{ color: "var(--st-done)" }}>Recettes</div><div className="v" style={{ color: "var(--st-done)" }}>{eur(b.recettes)}</div></div>
        <div className="stat"><div className="k" style={{ color: "var(--danger)" }}>Dépenses</div><div className="v" style={{ color: "var(--danger)" }}>{eur(b.depenses)}</div></div>
        <div className="stat"><div className="k"><IcEuro /> Marge</div><div className="v" style={{ color: b.marge >= 0 ? "var(--accent-strong)" : "var(--danger)" }}>{eur(b.marge)}</div></div>
        <div className="stat"><div className="k">Rentabilité</div><div className="v">{b.rentabilite != null ? `${b.rentabilite.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}` : "—"}<small>%</small></div></div>
      </div>

      {/* Écritures */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 14 }}>Écritures</h2>
        {filtrees.length === 0 ? (
          <div className="card pad empty">
            <div className="ic"><IcEuro /></div>
            <h3>Aucune écriture</h3>
            <p>Ajoute tes recettes (ventes de bois, acomptes…) et tes dépenses (carburant, entretien, main-d&apos;œuvre…).</p>
            <Link href="/compta/nouvelle" className="btn primary big"><IcPlus /> Nouvelle écriture</Link>
          </div>
        ) : (
          <div className="list">
            {filtrees.map((f) => (
              <div className="jrow" key={f.id}>
                <div className="fin-amt" style={{ color: f.type === "recette" ? "var(--st-done)" : "var(--danger)" }}>
                  {f.type === "recette" ? "+" : "−"}{eur(f.montant)}
                </div>
                <div className="jbody">
                  <div className="t">{f.libelle || f.categorie || (f.type === "recette" ? "Recette" : "Dépense")}</div>
                  <div className="m muted">
                    {f.categorie && <span>{f.categorie}</span>}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IcSite style={{ width: 13, height: 13 }} /> {nomChantier(f.chantierId)}</span>
                    <span>{formatDate(f.date)}</span>
                  </div>
                </div>
                <div className="jactions">
                  <Link href={`/compta/${f.id}/modifier`} className="iconbtn" aria-label="Modifier"><IcEdit /></Link>
                  <button className="iconbtn" aria-label="Supprimer" onClick={() => { if (confirm("Supprimer cette écriture ?")) supprimerFinance(f.id); }}><IcTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
