import { db } from "./db";

/* ============================================================
   Sauvegarde / restauration complète des données locales
   dans un unique fichier (JSON). Les photos et documents
   (Blobs) sont encodés en base64.
   ============================================================ */

const APP = "sylva";
const FORMAT = 1;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(((r.result as string) || "").split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime || "application/octet-stream" });
}

export interface Sauvegarde {
  app: string;
  format: number;
  exportedAt: string;
  chantiers: unknown[];
  geometries: unknown[];
  journees: unknown[];
  photos: unknown[];
  documents: unknown[];
}

export async function exporterSauvegarde(): Promise<string> {
  const [chantiers, geometries, journees, photos, documents] = await Promise.all([
    db.chantiers.toArray(),
    db.geometries.toArray(),
    db.journees.toArray(),
    db.photos.toArray(),
    db.documents.toArray(),
  ]);

  const photosOut = await Promise.all(
    photos.map(async (p) => ({ ...p, blob: undefined, _b64: await blobToBase64(p.blob), _mime: p.blob.type }))
  );
  const docsOut = await Promise.all(
    documents.map(async (d) => ({ ...d, blob: undefined, _b64: await blobToBase64(d.blob), _mime: d.mime }))
  );

  const data: Sauvegarde = {
    app: APP,
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    chantiers,
    geometries,
    journees,
    photos: photosOut,
    documents: docsOut,
  };
  return JSON.stringify(data);
}

export interface ImportResult {
  chantiers: number;
  geometries: number;
  journees: number;
  photos: number;
  documents: number;
}

export async function importerSauvegarde(json: string): Promise<ImportResult> {
  const data = JSON.parse(json) as Partial<Sauvegarde>;
  if (data.app !== APP) throw new Error("Ce fichier n'est pas une sauvegarde Sylva.");

  const photos = (data.photos ?? []).map((p) => {
    const o = p as Record<string, unknown>;
    const blob = base64ToBlob(String(o._b64 ?? ""), String(o._mime ?? ""));
    delete o._b64; delete o._mime;
    return { ...o, blob } as unknown;
  });
  const documents = (data.documents ?? []).map((d) => {
    const o = d as Record<string, unknown>;
    const blob = base64ToBlob(String(o._b64 ?? ""), String(o._mime ?? ""));
    delete o._b64; delete o._mime;
    return { ...o, blob } as unknown;
  });

  await db.transaction("rw", db.chantiers, db.geometries, db.journees, db.photos, db.documents, async () => {
    if (data.chantiers) await db.chantiers.bulkPut(data.chantiers as never[]);
    if (data.geometries) await db.geometries.bulkPut(data.geometries as never[]);
    if (data.journees) await db.journees.bulkPut(data.journees as never[]);
    if (photos.length) await db.photos.bulkPut(photos as never[]);
    if (documents.length) await db.documents.bulkPut(documents as never[]);
  });

  return {
    chantiers: data.chantiers?.length ?? 0,
    geometries: data.geometries?.length ?? 0,
    journees: data.journees?.length ?? 0,
    photos: photos.length,
    documents: documents.length,
  };
}

export function nomFichierSauvegarde(): string {
  return `sylva-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
}

/* Estimation de l'espace utilisé (si l'API est disponible). */
export async function estimationStockage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  }
  return null;
}
