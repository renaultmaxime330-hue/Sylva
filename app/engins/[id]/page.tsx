"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { enginTypeLabel, type Entretien } from "@/lib/db";
import {
  supprimerEngin, ajouterEntretien, supprimerEntretien, alerteEntretien, type EntretienInput,
} from "@/lib/engins";
import { useEngin, useEntretiens } from "@/lib/queries/engins";
import { today } from "@/lib/format";
import { IcBack, IcEdit, IcTrash, IcTruck, IcWarning, IcCheck, IcPlus } from "@/lib/icons";

const TYPE_LABEL: Record<Entretien["type"], string> = {
  entretien: "Entretien", revision: "Révision", reparation: "Réparation",
};

export default function FicheEngin() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: engin } = useEngin(id);
  const { data: entretiensNonTries } = useEntretiens(id);
  const entretiens = entretiensNonTries?.slice().sort((a, b) => b.date.localeCompare(a.date));

  if (engin === undefined || entretiens === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (engin === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcTruck /></div>
        <h3>Engin introuvable</h3>
        <Link href="/engins" className="btn primary">Retour aux engins</Link>
      </div>
    );
  }

  const alerte = alerteEntretien(engin, entretiens);

  async function onSupprimer() {
    if (!confirm(`Supprimer « ${engin!.nom} » et son historique d'entretien ?`)) return;
    await supprimerEngin(id);
    router.push("/engins");
  }

  const cells = [
    { k: "Marque", v: engin.marque || "—" },
    { k: "Modèle", v: engin.modele || "—" },
  ];

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/engins" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}><IcBack /> Engins</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1>{engin.nom}</h1>
            {engin.actif ? <span className="pill done sm"><IcCheck /> En service</span> : <span className="pill todo sm">Hors service</span>}
          </div>
          <p className="sub">{enginTypeLabel(engin.type)}{engin.marque ? ` · ${engin.marque}` : ""}</p>
        </div>
        <div className="actions">
          <Link href={`/engins/${id}/modifier`} className="btn big"><IcEdit /> Modifier</Link>
          <button className="btn danger big" onClick={onSupprimer}><IcTrash /> Supprimer</button>
        </div>
      </div>

      <div className="tech-plaque">
        <div className="tech-meter">
          <div className="hv">{engin.heuresTotal != null ? engin.heuresTotal.toLocaleString("fr-FR") : "—"}</div>
          <div className="hu">heures</div>
        </div>
        <div className="tp-item"><span className="k">Entretien tous les</span><span className="v">{engin.seuilEntretienH != null ? `${engin.seuilEntretienH} h` : "—"}</span></div>
        <div className="tp-sep" />
        {cells.map((c) => (
          <div className="tp-item" key={c.k}><span className="k">{c.k}</span><span className="v">{c.v}</span></div>
        ))}
      </div>

      {/* Alerte entretien */}
      {(alerte.niveau === "depasse" || alerte.niveau === "bientot") && (
        <div className={`tech-alerte ${alerte.niveau}`}>
          <IcWarning className="ic" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="tt">{alerte.niveau === "depasse" ? "Entretien dépassé" : "Entretien à prévoir bientôt"}</div>
            <div className="dd">
              {alerte.heuresDepuis} h depuis le dernier entretien
              {alerte.reste != null && (alerte.reste <= 0 ? ` · dépassé de ${Math.abs(alerte.reste)} h` : ` · reste ${alerte.reste} h`)}.
            </div>
          </div>
        </div>
      )}

      {engin.notes && (
        <div className="card pad">
          <span className="k" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", fontWeight: 700 }}>Notes</span>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{engin.notes}</p>
        </div>
      )}

      {/* Journal d'entretien */}
      <section>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 14 }}>Entretiens &amp; révisions</h2>
        <AjoutEntretien enginId={id} heuresActuelles={engin.heuresTotal} />
        {entretiens.length === 0 ? (
          <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>Aucun entretien enregistré pour l&apos;instant.</p>
        ) : (
          <div className="tech-histo" style={{ marginTop: 16 }}>
            {entretiens.map((e) => {
              const d = new Date(e.date + "T00:00:00");
              return (
                <div className="tech-histo-row" key={e.id}>
                  <div className="thd">
                    <div className="d">{isNaN(d.getTime()) ? "—" : d.getDate()}</div>
                    <div className="mo">{isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { month: "short" })}</div>
                  </div>
                  <div className="thb">
                    <div className="t">{TYPE_LABEL[e.type]}</div>
                    <div className="m">
                      {e.heuresCompteur != null && <span>{e.heuresCompteur.toLocaleString("fr-FR")} h</span>}
                      {e.cout != null && <span>{e.cout.toLocaleString("fr-FR")} €</span>}
                      {e.carburantL != null && <span>{e.carburantL} L carburant</span>}
                      {e.huile && <span>huile</span>}
                      {e.notes && <span>{e.notes}</span>}
                    </div>
                  </div>
                  <button className="iconbtn" aria-label="Supprimer"
                    onClick={() => { if (confirm("Supprimer cet entretien ?")) supprimerEntretien(e.id, id); }}>
                    <IcTrash />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* Formulaire d'ajout d'un entretien (inline). */
function AjoutEntretien({ enginId, heuresActuelles }: { enginId: string; heuresActuelles?: number }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<EntretienInput>({
    enginId, type: "entretien", date: today(), heuresCompteur: heuresActuelles,
    cout: undefined, carburantL: undefined, huile: false, notes: "",
  });
  const set = <K extends keyof EntretienInput>(k: K, v: EntretienInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? undefined : Number(v));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await ajouterEntretien(f);
    setF({ enginId, type: "entretien", date: today(), heuresCompteur: heuresActuelles, cout: undefined, carburantL: undefined, huile: false, notes: "" });
    setOpen(false);
  }

  if (!open) return <button className="btn primary" onClick={() => setOpen(true)}><IcPlus /> Ajouter un entretien</button>;

  return (
    <form className="card pad form" onSubmit={submit}>
      <div className="grid-3">
        <div className="field">
          <label htmlFor="et">Type</label>
          <select id="et" className="select" value={f.type} onChange={(e) => set("type", e.target.value as EntretienInput["type"])}>
            <option value="entretien">Entretien</option>
            <option value="revision">Révision</option>
            <option value="reparation">Réparation</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ed">Date</label>
          <input id="ed" className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="eh">Compteur (h)</label>
          <input id="eh" className="input" type="number" step="0.1" min="0" inputMode="decimal"
            value={f.heuresCompteur ?? ""} onChange={(e) => set("heuresCompteur", num(e.target.value))} />
        </div>
      </div>
      <div className="grid-3">
        <div className="field">
          <label htmlFor="ec">Coût (€)</label>
          <input id="ec" className="input" type="number" step="0.01" min="0" inputMode="decimal"
            value={f.cout ?? ""} onChange={(e) => set("cout", num(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="ecarb">Carburant (L)</label>
          <input id="ecarb" className="input" type="number" step="0.1" min="0" inputMode="decimal"
            value={f.carburantL ?? ""} onChange={(e) => set("carburantL", num(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="ehuile">Vidange / huile</label>
          <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button type="button" className="done" data-on={f.huile} onClick={() => set("huile", true)}>Oui</button>
            <button type="button" className="todo" data-on={!f.huile} onClick={() => set("huile", false)}>Non</button>
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="en">Notes</label>
        <input id="en" className="input" value={f.notes} placeholder="Ex. changement chaîne, filtre…" onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn primary"><IcCheck /> Enregistrer</button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </form>
  );
}
