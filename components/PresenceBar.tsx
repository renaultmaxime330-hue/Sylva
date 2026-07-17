"use client";

import Link from "next/link";
import { roleLabel } from "@/lib/profil";
import { depuis, type EtatPresence } from "@/lib/presence";
import { IcUsers, IcPin } from "@/lib/icons";

export default function PresenceBar({ dansEquipe, actif, equipiers, erreur, basculer }: EtatPresence) {
  if (!dansEquipe) {
    return (
      <p className="muted presence-hint">
        <IcUsers /> Pour voir ton débardeur en direct sur la carte, crée ton équipe dans{" "}
        <Link href="/reglages">Réglages</Link> et donne-lui le code.
      </p>
    );
  }

  const localises = equipiers.filter((e) => e.lat != null && e.lng != null);
  const enAttente = equipiers.length - localises.length;

  return (
    <div className="presence-bar">
      <label className="switch">
        <input type="checkbox" checked={actif} onChange={basculer} />
        <span>
          <b>Position en direct</b>
          <span className="muted"> — partage ma position avec mon équipe tant que l&apos;app est ouverte</span>
        </span>
      </label>

      {erreur && <p className="presence-err">{erreur}</p>}

      {actif && (
        equipiers.length === 0 ? (
          <p className="muted presence-vide">
            <IcPin /> Personne d&apos;autre n&apos;a l&apos;app ouverte pour l&apos;instant. Dès que ton débardeur active
            le partage, il apparaît ici et sur la carte.
          </p>
        ) : (
          <div className="presence-list">
            {equipiers.map((e) => {
              const ok = e.lat != null && e.lng != null;
              return (
                <span className="presence-chip" key={e.userId} data-role={e.role}>
                  <span className="pdot" />
                  <b>{e.nom}</b>
                  <span className="muted">
                    {roleLabel(e.role)} · {ok ? depuis(e.maj) : "position en attente"}
                  </span>
                </span>
              );
            })}
            {enAttente > 0 && localises.length > 0 && (
              <span className="muted" style={{ fontSize: 13 }}>
                {enAttente} en attente de GPS
              </span>
            )}
          </div>
        )
      )}
    </div>
  );
}
