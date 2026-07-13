"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, totalVolume, type Chantier, type Photo, type DocFile } from "@/lib/db";
import {
  supprimerChantier, ajouterPhoto, supprimerPhoto,
  ajouterDocument, supprimerDocument, obtenirPosition, marquerTermine,
} from "@/lib/chantiers";
import StatutPill from "@/components/StatutPill";
import VolumesChantier from "@/components/VolumesChantier";
import MapChantier from "@/components/MapChantier";
import { formatDate, formatSurface, formatGPS, formatTaille } from "@/lib/format";
import {
  IcBack, IcEdit, IcTrash, IcCamera, IcDoc, IcPlus, IcChart, IcCheck,
} from "@/lib/icons";

type Tab = "infos" | "carte" | "volumes" | "photos" | "docs";

export default function FicheChantier() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("infos");

  const chantier = useLiveQuery(() => db.chantiers.get(id).then((c) => c ?? null), [id]);
  const photos = useLiveQuery(
    () => db.photos.where("chantierId").equals(id).reverse().sortBy("createdAt"),
    [id]
  );
  const docs = useLiveQuery(
    () => db.documents.where("chantierId").equals(id).reverse().sortBy("createdAt"),
    [id]
  );

  if (chantier === undefined) return <div className="muted" style={{ padding: 40 }}>Chargement…</div>;
  if (chantier === null) {
    return (
      <div className="card pad empty">
        <div className="ic"><IcBack /></div>
        <h3>Chantier introuvable</h3>
        <p>Ce chantier a peut-être été supprimé.</p>
        <Link href="/chantiers" className="btn primary">Retour aux chantiers</Link>
      </div>
    );
  }

  async function onSupprimer() {
    if (!confirm(`Supprimer le chantier « ${chantier!.nom} » ?\nCette action supprime aussi ses photos et documents.`)) return;
    await supprimerChantier(id);
    router.push("/chantiers");
  }

  const nbPhotos = photos?.length ?? 0;
  const nbDocs = docs?.length ?? 0;

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <Link href="/chantiers" className="btn ghost" style={{ marginBottom: 10, paddingLeft: 8 }}>
            <IcBack /> Chantiers
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1>{chantier.nom}</h1>
            <StatutPill statut={chantier.statut} />
          </div>
          <p className="sub">
            {chantier.proprietaire || "Propriétaire ?"}
            {chantier.commune && ` · ${chantier.commune}`}
          </p>
        </div>
        <div className="actions">
          <Link href={`/chantiers/${id}/modifier`} className="btn big"><IcEdit /> Modifier</Link>
          <button className="btn danger big" onClick={onSupprimer}><IcTrash /> Supprimer</button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "infos" ? "on" : ""} onClick={() => setTab("infos")}>Infos</button>
        <button className={tab === "carte" ? "on" : ""} onClick={() => setTab("carte")}>Carte</button>
        <button className={tab === "volumes" ? "on" : ""} onClick={() => setTab("volumes")}>Volumes</button>
        <button className={tab === "photos" ? "on" : ""} onClick={() => setTab("photos")}>Photos {nbPhotos > 0 && `(${nbPhotos})`}</button>
        <button className={tab === "docs" ? "on" : ""} onClick={() => setTab("docs")}>Documents {nbDocs > 0 && `(${nbDocs})`}</button>
      </div>

      {tab === "infos" && <OngletInfos chantier={chantier} />}
      {tab === "carte" && <MapChantier chantier={chantier} readOnly editHref={`/carte?c=${id}`} />}
      {tab === "volumes" && <OngletVolumes chantier={chantier} />}
      {tab === "photos" && <OngletPhotos id={id} photos={photos ?? []} />}
      {tab === "docs" && <OngletDocs id={id} docs={docs ?? []} />}
    </div>
  );
}

/* ---------- Onglet Infos ---------- */
function OngletInfos({ chantier: c }: { chantier: Chantier }) {
  const cells: { k: string; v: string; mono?: boolean }[] = [
    { k: "Propriétaire", v: c.proprietaire || "—" },
    { k: "Client", v: c.client || "—" },
    { k: "Parcelle", v: c.numParcelle || "—" },
    { k: "Commune", v: c.commune || "—" },
    { k: "Coordonnées GPS", v: formatGPS(c.lat, c.lng), mono: true },
    { k: "Surface", v: formatSurface(c.surfaceHa) },
    { k: "Peuplement", v: c.typePeuplement || "—" },
    { k: "Essence", v: c.essence || "—" },
    { k: "Date de début", v: formatDate(c.dateDebut) },
    { k: "Date de fin", v: formatDate(c.dateFin) },
  ];
  const vol = totalVolume(c);
  cells.push({
    k: "Volume total produit",
    v: vol > 0 ? `${vol.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m³` : "—",
  });
  return (
    <div className="stack-gap">
      <div className="info-grid">
        {cells.map((cell) => (
          <div className="info-cell" key={cell.k}>
            <span className="k">{cell.k}</span>
            <span className={"v" + (cell.mono ? " mono" : "")}>{cell.v}</span>
          </div>
        ))}
      </div>
      {c.notes && (
        <div className="card pad">
          <span className="k" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", fontWeight: 700 }}>Notes</span>
          <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{c.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Onglet Volumes ---------- */
function OngletVolumes({ chantier }: { chantier: Chantier }) {
  if (chantier.statut !== "termine") {
    return (
      <div className="card pad empty">
        <div className="ic"><IcChart /></div>
        <h3>Volumes disponibles une fois le chantier terminé</h3>
        <p>Tu pourras saisir le volume produit par catégorie (bois d'œuvre, trituration, bois énergie…) dès que le chantier est marqué comme terminé.</p>
        <button className="btn primary big" onClick={() => marquerTermine(chantier.id)}>
          <IcCheck /> Marquer comme terminé
        </button>
      </div>
    );
  }
  return <VolumesChantier chantier={chantier} />;
}

/* ---------- Onglet Photos ---------- */
function OngletPhotos({ id, photos }: { id: string; photos: Photo[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    let pos: { lat: number; lng: number } | undefined;
    try { pos = await obtenirPosition(); } catch { pos = undefined; }
    for (const file of files) {
      await ajouterPhoto(id, file, file.name || "photo.jpg", pos);
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="stack-gap">
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        multiple style={{ display: "none" }} onChange={onFiles} />
      <div>
        <button className="btn primary big" onClick={() => inputRef.current?.click()} disabled={busy}>
          <IcCamera /> {busy ? "Ajout…" : "Ajouter une photo"}
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcCamera /></div>
          <h3>Aucune photo</h3>
          <p>Prends des photos du chantier — elles sont enregistrées avec ta position GPS quand elle est disponible.</p>
        </div>
      ) : (
        <div className="gallery">
          {photos.map((p) => <PhotoTile key={p.id} photo={p} />)}
        </div>
      )}
    </div>
  );
}

function PhotoTile({ photo }: { photo: Photo }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    const u = URL.createObjectURL(photo.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo.blob]);
  return (
    <div className="ph">
      {url && <img src={url} alt={photo.nom} />}
      <button className="del" aria-label="Supprimer la photo"
        onClick={() => { if (confirm("Supprimer cette photo ?")) supprimerPhoto(photo.id); }}>
        <IcTrash />
      </button>
    </div>
  );
}

/* ---------- Onglet Documents ---------- */
function OngletDocs({ id, docs }: { id: string; docs: DocFile[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) await ajouterDocument(id, file);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function ouvrir(doc: DocFile) {
    const u = URL.createObjectURL(doc.blob);
    window.open(u, "_blank");
    setTimeout(() => URL.revokeObjectURL(u), 60000);
  }

  return (
    <div className="stack-gap">
      <input ref={inputRef} type="file" accept=".pdf,application/pdf,image/*"
        multiple style={{ display: "none" }} onChange={onFiles} />
      <div>
        <button className="btn primary big" onClick={() => inputRef.current?.click()} disabled={busy}>
          <IcPlus /> {busy ? "Ajout…" : "Ajouter un document"}
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="card pad empty">
          <div className="ic"><IcDoc /></div>
          <h3>Aucun document</h3>
          <p>Ajoute les contrats, autorisations de coupe ou plans PDF liés à ce chantier.</p>
        </div>
      ) : (
        <div className="list">
          {docs.map((d) => (
            <div className="doc-row" key={d.id}>
              <div className="fi"><IcDoc /></div>
              <div className="meta">
                <div className="n">{d.nom}</div>
                <div className="s">{formatTaille(d.taille)} · {formatDate(d.createdAt.slice(0, 10))}</div>
              </div>
              <button className="btn ghost" onClick={() => ouvrir(d)}>Ouvrir</button>
              <button className="iconbtn" aria-label="Supprimer le document"
                onClick={() => { if (confirm("Supprimer ce document ?")) supprimerDocument(d.id); }}>
                <IcTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
