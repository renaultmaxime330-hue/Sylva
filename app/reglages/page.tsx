"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useChantiers } from "@/lib/queries/chantiers";
import { exporterSauvegarde, importerSauvegarde, nomFichierSauvegarde, estimationStockage } from "@/lib/backup";
import { downloadText } from "@/lib/export";
import { formatTaille } from "@/lib/format";
import CloudSection from "@/components/CloudSection";
import EntrepriseSection from "@/components/EntrepriseSection";
import EquipeSection from "@/components/EquipeSection";
import MigrationSection from "@/components/MigrationSection";
import { IcSettings, IcDownload, IcUpload, IcCloud, IcCheck, IcWifiOff } from "@/lib/icons";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function ReglagesPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [online, setOnline] = useState(true);
  const [stockage, setStockage] = useState<{ usage: number; quota: number } | null>(null);
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const nbChantiers = useChantiers().data?.length;
  const nbGeoms = useLiveQuery(() => db.geometries.count(), []);
  const nbJournees = useLiveQuery(() => db.journees.count(), []);
  const nbPhotos = useLiveQuery(() => db.photos.count(), []);
  const nbDocs = useLiveQuery(() => db.documents.count(), []);

  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    estimationStockage().then(setStockage);
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallPromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(""), 5000); }

  async function sauvegarder() {
    setBusy(true);
    try {
      const json = await exporterSauvegarde();
      downloadText(nomFichierSauvegarde(), json, "application/json");
      flash("Sauvegarde téléchargée ✓ — garde ce fichier en lieu sûr.");
    } finally {
      setBusy(false);
    }
  }

  async function restaurer(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!confirm("Restaurer cette sauvegarde ?\nLes données du fichier seront ajoutées / mises à jour dans l'application.")) return;
    setBusy(true);
    try {
      const res = await importerSauvegarde(await file.text());
      flash(`Restauré : ${res.chantiers} chantiers, ${res.journees} journées, ${res.geometries} tracés, ${res.photos} photos, ${res.documents} documents.`);
    } catch (err) {
      flash("Échec : " + (err instanceof Error ? err.message : "fichier illisible."));
    } finally {
      setBusy(false);
    }
  }

  async function installer() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  const pct = stockage && stockage.quota > 0 ? Math.min(100, (stockage.usage / stockage.quota) * 100) : 0;

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Réglages</p>
          <h1>Réglages &amp; sauvegarde</h1>
          <p className="sub">Installe l&apos;application, sauvegarde tes données et gère le fonctionnement hors-ligne.</p>
        </div>
      </div>

      {msg && <div className="banner fade-in"><IcCheck /> {msg}</div>}

      {/* État hors-ligne */}
      <div className="card pad">
        <h3 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {online ? <IcCloud /> : <IcWifiOff />} Fonctionnement hors-ligne
        </h3>
        <p className="muted" style={{ fontSize: 14.5 }}>
          Toutes tes données sont enregistrées <b>sur l&apos;appareil</b> : l&apos;application fonctionne
          sans réseau. {online ? "Tu es actuellement en ligne." : "Tu es actuellement hors-ligne — tu peux continuer à travailler normalement."}
        </p>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14 }}>
          <span className="mini-stat"><b>{nbChantiers ?? 0}</b> chantiers</span>
          <span className="mini-stat"><b>{nbGeoms ?? 0}</b> tracés</span>
          <span className="mini-stat"><b>{nbJournees ?? 0}</b> journées</span>
          <span className="mini-stat"><b>{nbPhotos ?? 0}</b> photos</span>
          <span className="mini-stat"><b>{nbDocs ?? 0}</b> documents</span>
        </div>
        {stockage && (
          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
              Espace utilisé : {formatTaille(stockage.usage)}{stockage.quota > 0 ? ` sur ${formatTaille(stockage.quota)}` : ""}
            </div>
            <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </div>

      {/* Installation */}
      <div className="card pad">
        <h3 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><IcSettings /> Installer l&apos;application</h3>
        {installed ? (
          <p className="muted" style={{ fontSize: 14.5 }}><IcCheck /> L&apos;application est installée sur cet appareil.</p>
        ) : installEvt ? (
          <>
            <p className="muted" style={{ fontSize: 14.5, marginBottom: 14 }}>Installe Sylva comme une vraie application, avec une icône sur ton écran d&apos;accueil.</p>
            <button className="btn primary big" onClick={installer}><IcDownload /> Installer l&apos;application</button>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 14.5 }}>
            Pour installer : sur mobile, menu du navigateur → <b>« Ajouter à l&apos;écran d&apos;accueil »</b> ;
            sur ordinateur, icône d&apos;installation dans la barre d&apos;adresse.
          </p>
        )}
      </div>

      {/* Mon entreprise (pour les devis/factures) */}
      <EntrepriseSection />

      {/* Sauvegarde / restauration */}
      <div className="card pad">
        <h3 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><IcDownload /> Sauvegarde des données</h3>
        <p className="muted" style={{ fontSize: 14.5, marginBottom: 16 }}>
          Télécharge <b>toutes tes données</b> (chantiers, cartes, journées, photos, documents) dans un seul fichier.
          Garde-le en lieu sûr : tu pourras tout restaurer sur cet appareil ou un autre.
        </p>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={restaurer} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn primary big" onClick={sauvegarder} disabled={busy}>
            <IcDownload /> {busy ? "…" : "Télécharger une sauvegarde"}
          </button>
          <button className="btn big" onClick={() => fileRef.current?.click()} disabled={busy}>
            <IcUpload /> Restaurer une sauvegarde
          </button>
        </div>
      </div>

      {/* Synchronisation cloud (Supabase) */}
      <CloudSection />

      {/* Équipe (collaboration abatteur / débardeur) */}
      <EquipeSection />

      {/* Migration des données locales vers le nouveau serveur */}
      <MigrationSection />
    </div>
  );
}
