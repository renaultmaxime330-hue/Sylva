"use client";

import Link from "next/link";
import { MATERIEL_CATEGORIES, materielCatLabel, type Materiel } from "@/lib/db";
import { ajusterQuantite, supprimerMateriel, stockBas } from "@/lib/materiel";
import { useMateriel } from "@/lib/queries/materiel";
import { IcBox, IcPlus, IcMinus, IcEdit, IcTrash, IcWarning } from "@/lib/icons";

export default function MaterielPage() {
  const { data: materiel } = useMateriel();
  if (!materiel) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const nbBas = materiel.filter(stockBas).length;
  // Regroupé par catégorie (dans l'ordre défini)
  const groupes = MATERIEL_CATEGORIES
    .map((c) => ({ cat: c.value, label: c.label, items: materiel.filter((m) => m.categorie === c.value).sort((a, b) => a.nom.localeCompare(b.nom)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Matériel</p>
          <h1>Inventaire</h1>
          <p className="sub">
            {materiel.length} article{materiel.length > 1 ? "s" : ""}
            {nbBas > 0 && <> · <span style={{ color: "var(--danger)", fontWeight: 700 }}>{nbBas} en stock bas</span></>}
          </p>
        </div>
        <div className="actions">
          <Link href="/materiel/nouveau" className="btn primary big"><IcPlus /> Nouvel article</Link>
        </div>
      </div>

      {materiel.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcBox /></div>
          <h3>Inventaire vide</h3>
          <p>Ajoute ton matériel (chaînes, guides, casques, carburant, huiles, pièces…) pour suivre tes stocks.</p>
          <Link href="/materiel/nouveau" className="btn primary big"><IcPlus /> Ajouter un article</Link>
        </div>
      ) : (
        groupes.map((g) => (
          <section key={g.cat}>
            <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em", marginBottom: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{g.label}</h2>
            <div className="list">
              {g.items.map((m) => <MaterielRow key={m.id} m={m} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function MaterielRow({ m }: { m: Materiel }) {
  const bas = stockBas(m);
  return (
    <div className="mat-row">
      <div className="mbody">
        <div className="t">{m.nom} {bas && <span className="pill sm" style={{ color: "var(--danger)", background: "var(--danger-bg)" }}><IcWarning /> Stock bas</span>}</div>
        <div className="m muted">{materielCatLabel(m.categorie)}{m.seuilAlerte != null && ` · alerte à ${m.seuilAlerte} ${m.unite}`}</div>
      </div>
      <div className="qty">
        <button className="qbtn" aria-label="Retirer" onClick={() => ajusterQuantite(m.id, -1)}><IcMinus /></button>
        <span className="qval">{m.quantite.toLocaleString("fr-FR")} <small>{m.unite}</small></span>
        <button className="qbtn" aria-label="Ajouter" onClick={() => ajusterQuantite(m.id, 1)}><IcPlus /></button>
      </div>
      <div className="jactions">
        <Link href={`/materiel/${m.id}/modifier`} className="iconbtn" aria-label="Modifier"><IcEdit /></Link>
        <button className="iconbtn" aria-label="Supprimer" onClick={() => { if (confirm(`Supprimer « ${m.nom} » ?`)) supprimerMateriel(m.id); }}><IcTrash /></button>
      </div>
    </div>
  );
}
