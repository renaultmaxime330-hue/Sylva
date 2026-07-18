"use client";

import Link from "next/link";
import { useState } from "react";
import type { NotifType } from "@/lib/db";
import { useNotifs } from "@/lib/queries/notifs";
import {
  marquerLu, marquerToutLu, supprimerNotif, viderNotifs, notifInfo, quand,
} from "@/lib/notifications";
import { IcBell, IcCheck, IcTrash, IcTruck, IcBox, IcSite, IcMap, IcChevron } from "@/lib/icons";

const FILTRES: { value: NotifType | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "carte", label: "Carte" },
  { value: "entretien", label: "Entretien" },
  { value: "stock", label: "Stock" },
  { value: "chantier", label: "Chantiers" },
];

function IcNotif({ type }: { type: NotifType }) {
  if (type === "entretien") return <IcTruck />;
  if (type === "stock") return <IcBox />;
  if (type === "chantier") return <IcSite />;
  return <IcMap />;
}

export default function AlertesPage() {
  const [filtre, setFiltre] = useState<NotifType | "toutes">("toutes");
  const { data: notifs } = useNotifs();

  if (!notifs) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;

  const liste = filtre === "toutes" ? notifs : notifs.filter((n) => n.type === filtre);
  const nonLues = notifs.filter((n) => !n.lu).length;

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Alertes</p>
          <h1>Centre d&apos;alertes</h1>
          <p className="sub">
            Entretiens à faire, stock bas, chantiers terminés, et ce que ton équipe modifie sur la carte.
          </p>
        </div>
        {notifs.length > 0 && (
          <div className="head-actions">
            {nonLues > 0 && (
              <button className="btn" onClick={() => marquerToutLu()}><IcCheck /> Tout marquer comme lu</button>
            )}
            <button className="btn ghost" onClick={() => { if (confirm("Effacer toutes les alertes ?")) viderNotifs(); }}>
              <IcTrash /> Tout effacer
            </button>
          </div>
        )}
      </div>

      <div className="seg-mini wide" style={{ alignSelf: "flex-start", flexWrap: "wrap" }}>
        {FILTRES.map((f) => {
          const n = f.value === "toutes" ? notifs.length : notifs.filter((x) => x.type === f.value).length;
          return (
            <button key={f.value} data-on={filtre === f.value} onClick={() => setFiltre(f.value)}>
              {f.label}{n > 0 && ` (${n})`}
            </button>
          );
        })}
      </div>

      {liste.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcBell /></div>
          <h3>Rien à signaler</h3>
          <p>
            Les alertes arrivent ici toutes seules : entretien d&apos;un engin qui approche, stock bas,
            chantier terminé, ou quand ton débardeur touche à la carte.
          </p>
        </div>
      ) : (
        <div className="list">
          {liste.map((n) => {
            const info = notifInfo(n.type);
            const corps = (
              <>
                <span className="nglyph" style={{ background: info.couleur }}><IcNotif type={n.type} /></span>
                <div className="jbody">
                  <div className="t">
                    {!n.lu && <span className="npoint" aria-label="Non lue" />}
                    {n.titre}
                  </div>
                  <div className="m muted">{n.detail}</div>
                  <div className="m muted" style={{ fontSize: 12.5 }}>{quand(n.createdAt)}</div>
                </div>
              </>
            );
            return (
              <div className={"notif-row" + (!n.lu ? " neuve" : "")} key={n.id}>
                {n.href ? (
                  <Link href={n.href} className="nlien" onClick={() => marquerLu(n.id)}>
                    {corps}
                    <IcChevron />
                  </Link>
                ) : (
                  <div className="nlien">{corps}</div>
                )}
                <div className="jactions">
                  {!n.lu && (
                    <button className="iconbtn" aria-label="Marquer comme lue" title="Marquer comme lue"
                      onClick={() => marquerLu(n.id)}><IcCheck /></button>
                  )}
                  <button className="iconbtn" aria-label="Supprimer" title="Supprimer"
                    onClick={() => supprimerNotif(n.id)}><IcTrash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
