"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/client/auth";
import { exporterSauvegarde } from "@/lib/backup";
import { db } from "@/lib/db";
import { monEquipe } from "@/lib/client/teams";
import { IcUpload, IcCheck, IcTrash } from "@/lib/icons";

interface Resultat {
  clients: number; chantiers: number; geometries: number; journees: number;
  engins: number; entretiens: number; materiel: number; finances: number; factures: number; ignores: number;
}

export default function MigrationSection() {
  const { utilisateur, pret } = useAuth();
  const [busy, setBusy] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState("");

  async function importer() {
    if (!confirm("Envoyer toutes tes données locales (chantiers, cartes, journées, engins, matériel, comptabilité, clients, factures) vers l'équipe sur le serveur ?\n\nÀ faire une seule fois par appareil — cela n'écrase rien, ça ajoute.")) return;
    setBusy(true); setErreur(""); setResultat(null);
    try {
      const eq = await monEquipe();
      if (!eq) throw new Error("Rejoins ou crée une équipe d'abord (section ci-dessous).");
      const json = await exporterSauvegarde();
      const r = await apiFetch("/api/migration/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: json,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erreur ?? "Échec de l'import.");
      setResultat(d);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Échec.");
    } finally {
      setBusy(false);
    }
  }

  async function vider() {
    if (!confirm("Vider les données de cet appareil ?\n\nElles resteront disponibles sur le serveur pour toute l'équipe. À ne faire qu'après avoir vérifié que l'import a bien fonctionné.")) return;
    await db.delete();
    location.reload();
  }

  if (!pret || !utilisateur) return null;

  return (
    <div className="card pad">
      <h3 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><IcUpload /> Rapatrier mes données sur le serveur</h3>
      <p className="muted" style={{ fontSize: 14.5, marginBottom: 16 }}>
        Envoie une fois tes chantiers, cartes, journées, engins, matériel, comptabilité, clients et factures déjà
        présents sur cet appareil vers l&apos;équipe. Les photos et documents ne sont pas concernés.
      </p>

      {erreur && <div className="banner" style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger)" }}>{erreur}</div>}

      {resultat && (
        <div className="banner" style={{ marginBottom: 14, flexWrap: "wrap" }}>
          <IcCheck /> Envoyé : {resultat.chantiers} chantiers, {resultat.clients} clients, {resultat.geometries} tracés,{" "}
          {resultat.journees} journées, {resultat.engins} engins, {resultat.entretiens} entretiens,{" "}
          {resultat.materiel} matériel, {resultat.finances} écritures, {resultat.factures} devis/factures.
          {resultat.ignores > 0 && ` (${resultat.ignores} ignorés, référence introuvable.)`}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn primary big" onClick={importer} disabled={busy}>
          <IcUpload /> {busy ? "…" : "Envoyer mes données locales"}
        </button>
        {resultat && (
          <button className="btn ghost" onClick={vider}><IcTrash /> Vider les données de cet appareil</button>
        )}
      </div>
    </div>
  );
}
