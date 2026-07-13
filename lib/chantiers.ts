import { db, newId, type Chantier, type Photo, type DocFile, type VolumeCategorie } from "./db";

/* Accès aux données — création, modification, suppression.
   Chaque écriture est locale et instantanée ; syncStatus = "local"
   marque les enregistrements à envoyer au cloud plus tard. */

export type ChantierInput = Omit<
  Chantier,
  "id" | "createdAt" | "updatedAt" | "syncStatus"
>;

export async function creerChantier(data: ChantierInput): Promise<string> {
  const now = new Date().toISOString();
  const id = newId();
  await db.chantiers.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    syncStatus: "local",
  });
  return id;
}

export async function modifierChantier(id: string, data: Partial<ChantierInput>): Promise<void> {
  await db.chantiers.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
    syncStatus: "local",
  });
}

export async function majVolumes(id: string, volumes: VolumeCategorie[]): Promise<void> {
  await db.chantiers.update(id, {
    volumes,
    updatedAt: new Date().toISOString(),
    syncStatus: "local",
  });
}

export async function marquerTermine(id: string): Promise<void> {
  await db.chantiers.update(id, {
    statut: "termine",
    updatedAt: new Date().toISOString(),
    syncStatus: "local",
  });
}

export async function supprimerChantier(id: string): Promise<void> {
  await db.transaction("rw", db.chantiers, db.photos, db.documents, db.geometries, db.journees, async () => {
    await db.photos.where("chantierId").equals(id).delete();
    await db.documents.where("chantierId").equals(id).delete();
    await db.geometries.where("chantierId").equals(id).delete();
    await db.journees.where("chantierId").equals(id).delete();
    await db.chantiers.delete(id);
  });
}

export async function ajouterPhoto(
  chantierId: string,
  blob: Blob,
  nom: string,
  pos?: { lat: number; lng: number }
): Promise<void> {
  const photo: Photo = {
    id: newId(),
    chantierId,
    blob,
    nom,
    legende: "",
    lat: pos?.lat,
    lng: pos?.lng,
    createdAt: new Date().toISOString(),
  };
  await db.photos.add(photo);
}

export async function supprimerPhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}

export async function ajouterDocument(chantierId: string, file: File): Promise<void> {
  const doc: DocFile = {
    id: newId(),
    chantierId,
    blob: file,
    nom: file.name,
    mime: file.type || "application/octet-stream",
    taille: file.size,
    createdAt: new Date().toISOString(),
  };
  await db.documents.add(doc);
}

export async function supprimerDocument(id: string): Promise<void> {
  await db.documents.delete(id);
}

/* Géolocalisation — Promise autour de l'API navigateur. */
export function obtenirPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

/* Jeu de démonstration — inséré une seule fois pour montrer l'app remplie. */
export async function amorcerDemo(): Promise<void> {
  const count = await db.chantiers.count();
  if (count > 0) return;
  const now = new Date();
  const iso = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10);
  const base = new Date().toISOString();
  const demo: Chantier[] = [
    {
      id: newId(), nom: "Coupe rase des Grands Pins", proprietaire: "M. Lartigue",
      client: "GF de Sabres", numParcelle: "B 412", commune: "Sabres (40)",
      lat: 44.1461, lng: -0.9542, surfaceHa: 6.4, typePeuplement: "Futaie régulière",
      essence: "Pin maritime", dateDebut: iso(-6), dateFin: iso(4), statut: "en_cours",
      notes: "Accès par la piste DFCI. Attention ligne électrique au nord.",
      createdAt: base, updatedAt: base, syncStatus: "local",
    },
    {
      id: newId(), nom: "Éclaircie parcelle du Moulin", proprietaire: "Mme Darrigade",
      client: "", numParcelle: "A 88", commune: "Luxey (40)",
      lat: 44.2547, lng: -0.5361, surfaceHa: 3.1, typePeuplement: "Éclaircie",
      essence: "Pin maritime", dateDebut: iso(9), statut: "a_faire",
      notes: "Devis validé. Débardeur dispo semaine prochaine.",
      createdAt: base, updatedAt: base, syncStatus: "local",
    },
    {
      id: newId(), nom: "Chablis tempête — bois de Mées", proprietaire: "Commune de Mées",
      client: "Mairie de Mées", numParcelle: "C 15", commune: "Mées (40)",
      lat: 43.7231, lng: -1.0089, surfaceHa: 2.7, typePeuplement: "Chablis",
      essence: "Pin maritime, chêne", dateDebut: iso(-30), dateFin: iso(-12), statut: "termine",
      notes: "Terminé. 210 m³ sortis. Reste à évacuer les rémanents.",
      createdAt: base, updatedAt: base, syncStatus: "local",
    },
  ];
  await db.chantiers.bulkAdd(demo);
}
