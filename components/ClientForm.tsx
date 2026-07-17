"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Client } from "@/lib/db";
import { creerClient, modifierClient, champsVidesClient, type ClientInput } from "@/lib/clients";
import { IcCheck, IcBack } from "@/lib/icons";

export default function ClientForm({ initial }: { initial?: Client }) {
  const router = useRouter();
  const editing = !!initial;
  const [f, setF] = useState<ClientInput>(
    initial
      ? { nom: initial.nom, adresse: initial.adresse ?? "", commune: initial.commune ?? "", telephone: initial.telephone ?? "", email: initial.email ?? "", notes: initial.notes }
      : champsVidesClient()
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ClientInput>(k: K, v: ClientInput[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nom.trim()) return;
    setSaving(true);
    try {
      if (editing && initial) { await modifierClient(initial.id, f); router.push(`/clients/${initial.id}`); }
      else { const id = await creerClient(f); router.push(`/clients/${id}`); }
    } finally { setSaving(false); }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="nom">Nom du client / propriétaire</label>
        <input id="nom" className="input" value={f.nom} required autoFocus placeholder="Ex. M. Lartigue, GF de Sabres…"
          onChange={(e) => set("nom", e.target.value)} />
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="tel">Téléphone</label>
          <input id="tel" className="input" type="tel" value={f.telephone} placeholder="06 12 34 56 78" onChange={(e) => set("telephone", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="mail">E-mail</label>
          <input id="mail" className="input" type="email" value={f.email} placeholder="client@email.fr" onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="adr">Adresse</label>
          <input id="adr" className="input" value={f.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="com">Commune</label>
          <input id="com" className="input" value={f.commune} placeholder="Ex. Sabres (40)" onChange={(e) => set("commune", e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" className="textarea" value={f.notes} placeholder="Conditions, remarques…" onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn primary big" disabled={saving || !f.nom.trim()}>
          <IcCheck /> {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le client"}
        </button>
        <button type="button" className="btn big" onClick={() => router.back()}><IcBack /> Annuler</button>
      </div>
    </form>
  );
}
