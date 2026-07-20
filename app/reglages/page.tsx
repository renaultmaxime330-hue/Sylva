"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EntrepriseSection from "@/components/EntrepriseSection";
import EquipeSection from "@/components/EquipeSection";
import NotificationsSection from "@/components/NotificationsSection";
import { useAuth } from "@/components/AuthProvider";
import { IcSettings, IcDownload, IcCheck, IcLogout } from "@/lib/icons";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function ReglagesPage() {
  const router = useRouter();
  const { deconnecter } = useAuth();
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);

  async function onDeconnecter() {
    setDeconnexionEnCours(true);
    await deconnecter();
    router.push("/connexion");
  }

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallPromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installer() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Réglages</p>
          <h1>Réglages</h1>
          <p className="sub">Installe l&apos;application, gère ton entreprise et ton équipe.</p>
        </div>
      </div>

      {/* Installation */}
      <div className="card pad">
        <h3 className="sec-title"><span className="sec-ic"><IcSettings /></span> Installer l&apos;application</h3>
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

      {/* Notifications push */}
      <NotificationsSection />

      {/* Mon entreprise (pour les devis/factures) */}
      <EntrepriseSection />

      {/* Équipe (collaboration abatteur / débardeur) */}
      <EquipeSection />

      {/* Session */}
      <div className="card pad">
        <h3 className="sec-title"><span className="sec-ic danger"><IcLogout /></span> Session</h3>
        <p className="muted" style={{ fontSize: 14.5, marginBottom: 14 }}>Se déconnecter de Sylva sur cet appareil.</p>
        <button className="btn danger" onClick={onDeconnecter} disabled={deconnexionEnCours}>
          <IcLogout /> {deconnexionEnCours ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}
