"use client";

import { useEffect, useState } from "react";
import { getEntreprise, setEntreprise, entrepriseVide, type Entreprise } from "@/lib/entreprise";
import { IcReceipt, IcCheck } from "@/lib/icons";

export default function EntrepriseSection() {
  const [e, setE] = useState<Entreprise>(entrepriseVide());
  const [msg, setMsg] = useState("");
  useEffect(() => { setE(getEntreprise()); }, []);
  const set = <K extends keyof Entreprise>(k: K, v: Entreprise[K]) => setE((p) => ({ ...p, [k]: v }));

  function save(ev: React.FormEvent) {
    ev.preventDefault();
    setEntreprise(e);
    setMsg("Enregistré ✓");
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div className="card pad">
      <h3 className="sec-title" style={{ marginBottom: 6 }}><span className="sec-ic wood"><IcReceipt /></span> Mon entreprise</h3>
      <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>Ces coordonnées apparaissent en en-tête de tes devis et factures.</p>
      {msg && <div className="banner" style={{ marginBottom: 14 }}><IcCheck /> {msg}</div>}
      <form className="form" onSubmit={save}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ent-nom">Nom / raison sociale</label>
            <input id="ent-nom" className="input" value={e.nom} placeholder="Ex. Maxime Renault — Travaux forestiers" onChange={(ev) => set("nom", ev.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ent-siret">SIRET</label>
            <input id="ent-siret" className="input" value={e.siret} onChange={(ev) => set("siret", ev.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ent-adr">Adresse</label>
          <input id="ent-adr" className="input" value={e.adresse} onChange={(ev) => set("adresse", ev.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ent-tel">Téléphone</label>
            <input id="ent-tel" className="input" type="tel" value={e.telephone} onChange={(ev) => set("telephone", ev.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ent-mail">E-mail</label>
            <input id="ent-mail" className="input" type="email" value={e.email} onChange={(ev) => set("email", ev.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ent-tva">Mention TVA</label>
          <input id="ent-tva" className="input" value={e.mentionTVA} onChange={(ev) => set("mentionTVA", ev.target.value)} />
          <span className="hint">Affichée quand la TVA est à 0 % (ex. auto-entrepreneur).</span>
        </div>
        <div><button type="submit" className="btn primary big"><IcCheck /> Enregistrer</button></div>
      </form>
    </div>
  );
}
