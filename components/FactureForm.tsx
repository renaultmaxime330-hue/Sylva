"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOC_STATUTS, type DocCommercial, type DocStatut, type DocType } from "@/lib/db";
import { useClients } from "@/lib/queries/clients";
import { useChantiers } from "@/lib/queries/chantiers";
import {
  creerFacture, modifierFacture, champsVidesFacture, ligneVide, totalLigne, totauxDoc, type FactureInput,
} from "@/lib/facturation";
import { IcCheck, IcBack, IcPlus, IcTrash } from "@/lib/icons";

const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function FactureForm({ initial, type, numero }: { initial?: DocCommercial; type?: DocType; numero?: string }) {
  const router = useRouter();
  const editing = !!initial;
  const { data: clients } = useClients();
  const { data: chantiers } = useChantiers();

  const [f, setF] = useState<FactureInput>(
    initial
      ? { type: initial.type, numero: initial.numero, clientId: initial.clientId, clientNom: initial.clientNom, clientAdresse: initial.clientAdresse ?? "", chantierId: initial.chantierId, date: initial.date, dateEcheance: initial.dateEcheance, lignes: initial.lignes.map((l) => ({ ...l })), tva: initial.tva, notes: initial.notes, statut: initial.statut }
      : champsVidesFacture(type ?? "devis", numero ?? "")
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FactureInput>(k: K, v: FactureInput[K]) => setF((p) => ({ ...p, [k]: v }));

  function majLigne(i: number, patch: Partial<FactureInput["lignes"][number]>) {
    setF((p) => ({ ...p, lignes: p.lignes.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  }
  function ajouterLigne() { setF((p) => ({ ...p, lignes: [...p.lignes, ligneVide()] })); }
  function retirerLigne(i: number) { setF((p) => ({ ...p, lignes: p.lignes.filter((_, idx) => idx !== i) })); }

  function choisirClient(id: string) {
    const c = clients?.find((x) => x.id === id);
    setF((p) => ({ ...p, clientId: id || undefined, clientNom: c ? c.nom : p.clientNom, clientAdresse: c ? [c.adresse, c.commune].filter(Boolean).join(", ") : p.clientAdresse }));
  }

  const t = totauxDoc(f);
  const libelle = f.type === "devis" ? "devis" : "facture";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.clientNom.trim()) return;
    setSaving(true);
    try {
      if (editing && initial) { await modifierFacture(initial.id, f); router.push(`/factures/${initial.id}`); }
      else { const id = await creerFacture(f); router.push(`/factures/${id}`); }
    } finally { setSaving(false); }
  }

  if (!clients || !chantiers) return <div className="muted">Chargement…</div>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="grid-3">
        <div className="field">
          <label>Type</label>
          <div className="input" style={{ display: "flex", alignItems: "center", fontWeight: 700, textTransform: "capitalize" }}>{libelle}</div>
        </div>
        <div className="field">
          <label htmlFor="num">Numéro</label>
          <input id="num" className="input" value={f.numero} onChange={(e) => set("numero", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="statut">Statut</label>
          <select id="statut" className="select" value={f.statut} onChange={(e) => set("statut", e.target.value as DocStatut)}>
            {DOC_STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="cli">Client</label>
          <select id="cli" className="select" value={f.clientId ?? ""} onChange={(e) => choisirClient(e.target.value)}>
            <option value="">— Saisie libre —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cnom">Nom sur le document</label>
          <input id="cnom" className="input" required value={f.clientNom} placeholder="Ex. M. Lartigue" onChange={(e) => set("clientNom", e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="cadr">Adresse du client</label>
          <input id="cadr" className="input" value={f.clientAdresse} onChange={(e) => set("clientAdresse", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="chan">Chantier <span className="opt">(optionnel)</span></label>
          <select id="chan" className="select" value={f.chantierId ?? ""} onChange={(e) => set("chantierId", e.target.value || undefined)}>
            <option value="">—</option>
            {chantiers.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ech">{f.type === "devis" ? "Valable jusqu'au" : "Échéance"} <span className="opt">(optionnel)</span></label>
          <input id="ech" className="input" type="date" value={f.dateEcheance ?? ""} onChange={(e) => set("dateEcheance", e.target.value || undefined)} />
        </div>
      </div>

      {/* Lignes */}
      <div className="field">
        <label>Lignes</label>
        <div className="lignes">
          <div className="ligne-head">
            <span>Désignation</span><span>Qté</span><span>Unité</span><span>P.U. HT</span><span>Total</span><span />
          </div>
          {f.lignes.map((l, i) => (
            <div className="ligne" key={i}>
              <input className="input" placeholder="Ex. Pin maritime bois d'œuvre" value={l.designation} onChange={(e) => majLigne(i, { designation: e.target.value })} />
              <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={l.quantite} onChange={(e) => majLigne(i, { quantite: Number(e.target.value) || 0 })} />
              <input className="input" list="unites" value={l.unite} onChange={(e) => majLigne(i, { unite: e.target.value })} />
              <input className="input" type="number" step="0.01" min="0" inputMode="decimal" value={l.prixUnitaire} onChange={(e) => majLigne(i, { prixUnitaire: Number(e.target.value) || 0 })} />
              <span className="ligne-total">{eur(totalLigne(l))}</span>
              <button type="button" className="iconbtn" aria-label="Retirer" onClick={() => retirerLigne(i)} disabled={f.lignes.length <= 1}><IcTrash /></button>
            </div>
          ))}
          <datalist id="unites"><option value="m³" /><option value="h" /><option value="j" /><option value="forfait" /><option value="u" /></datalist>
        </div>
        <button type="button" className="btn" style={{ marginTop: 10 }} onClick={ajouterLigne}><IcPlus /> Ajouter une ligne</button>
      </div>

      {/* Totaux */}
      <div className="totaux">
        <div className="tva-field">
          <label htmlFor="tva">TVA (%)</label>
          <input id="tva" className="input" type="number" step="0.1" min="0" style={{ width: 90 }} value={f.tva} onChange={(e) => set("tva", Number(e.target.value) || 0)} />
        </div>
        <div className="totaux-lignes">
          <div><span>Total HT</span><b>{eur(t.ht)}</b></div>
          <div><span>TVA ({f.tva}%)</span><b>{eur(t.tvaMontant)}</b></div>
          <div className="ttc"><span>Total TTC</span><b>{eur(t.ttc)}</b></div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes / conditions</label>
        <textarea id="notes" className="textarea" value={f.notes} placeholder="Conditions de paiement, remarques…" onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn primary big" disabled={saving || !f.clientNom.trim()}>
          <IcCheck /> {saving ? "Enregistrement…" : editing ? "Enregistrer" : `Créer le ${libelle}`}
        </button>
        <button type="button" className="btn big" onClick={() => router.back()}><IcBack /> Annuler</button>
      </div>
    </form>
  );
}
