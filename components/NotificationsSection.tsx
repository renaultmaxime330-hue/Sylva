"use client";

import { useEffect, useState } from "react";
import { pushSupporte, abonnementActuel, activerPush, desactiverPush } from "@/lib/client/push";
import { IcBell } from "@/lib/icons";

/** Abonnement push PAR APPAREIL : PC, téléphone et tablette ont chacun le
    leur — activer ici ne concerne que l'appareil sur lequel on est. */
export default function NotificationsSection() {
  const [supporte, setSupporte] = useState<boolean | null>(null);
  const [actif, setActif] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ok = pushSupporte();
    setSupporte(ok);
    if (ok) abonnementActuel().then((s) => setActif(!!s)).catch(() => {});
  }, []);

  async function basculer() {
    setBusy(true); setErr("");
    try {
      if (actif) { await desactiverPush(); setActif(false); }
      else { await activerPush(); setActif(true); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec.");
    } finally {
      setBusy(false);
    }
  }

  if (supporte === null) return null;

  return (
    <div className="card pad">
      <h3 className="sec-title"><span className="sec-ic"><IcBell /></span> Notifications</h3>
      {!supporte ? (
        <p className="muted" style={{ fontSize: 14.5 }}>
          Les notifications push ne sont pas disponibles sur ce navigateur/appareil.
        </p>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>
            Reçois les alertes (entretien, stock, chantier) même quand Sylva n&apos;est pas ouvert — à activer
            séparément sur chaque appareil (PC, téléphone, tablette).
          </p>
          <label className="switch">
            <input type="checkbox" checked={actif} disabled={busy} onChange={basculer} />
            <span>Notifications push sur cet appareil</span>
          </label>
          {err && <p className="presence-err" style={{ marginTop: 10 }}>{err}</p>}
        </>
      )}
    </div>
  );
}
