import type { TourCategorie, Journee } from "./db";
import { apiFetch } from "./client/auth";
import { queryClient } from "./client/queryClient";

/* ============================================================
   Tours de porteur — catégories de qualité (Canter, Caisse…) et
   méthode de calcul du stérage : tours × capacité (stères/tour)
   = volume apparent (stères), puis stères × coefficient de
   foisonnement = volume de bois plein (m³). Les deux coefficients
   sont configurés par catégorie, jamais figés en dur — tant qu'une
   catégorie n'a pas de capacité renseignée, son volume n'est pas
   estimé (pas de chiffre inventé affiché comme un fait).
   ============================================================ */

export type TourCategorieInput =
  Omit<TourCategorie, "id" | "createdAt" | "updatedAt" | "capaciteTourSteres"> & { capaciteTourSteres?: number | null };

export function champsVidesTourCategorie(ordre = 0): TourCategorieInput {
  return { nom: "", couleur: "#2E6B41", capaciteTourSteres: undefined, coefficientSterage: 0.7, ordre, actif: true };
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

function invalider(id?: string) {
  void queryClient.invalidateQueries({ queryKey: ["tourCategories"] });
  if (id) void queryClient.invalidateQueries({ queryKey: ["tourCategories", id] });
}

export async function creerTourCategorie(data: TourCategorieInput): Promise<string> {
  const r = await apiFetch("/api/tour-categories", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer la catégorie.");
  const { categorie } = await r.json();
  invalider();
  return categorie.id as string;
}

export async function modifierTourCategorie(id: string, data: Partial<TourCategorieInput>): Promise<void> {
  const r = await apiFetch(`/api/tour-categories/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) await lireErreur(r, "Impossible de modifier la catégorie.");
  invalider(id);
}

export async function supprimerTourCategorie(id: string): Promise<void> {
  const r = await apiFetch(`/api/tour-categories/${id}`, { method: "DELETE" });
  if (!r.ok) await lireErreur(r, "Impossible de supprimer la catégorie.");
  invalider(id);
}

/* ---------- Calcul du stérage ---------- */

export interface LigneTours {
  categorie: TourCategorie;
  tours: number;
  steres: number | null;  // null si la capacité n'est pas configurée pour cette catégorie
  m3Plein: number | null; // null si steres est null
}

export interface RecapTours {
  totalTours: number;
  totalSteres: number;  // somme des catégories dont la capacité est configurée
  totalM3Plein: number;
  categoriesNonConfigurees: string[]; // noms des catégories utilisées mais sans capacité renseignée
  lignes: LigneTours[]; // catégories actives, ou inactives mais ayant des tours dans la période
}

export function agregerTours(journees: Pick<Journee, "tours">[], categories: TourCategorie[]): RecapTours {
  const parCategorie = new Map<string, number>();
  for (const j of journees) {
    for (const [catId, n] of Object.entries(j.tours ?? {})) {
      parCategorie.set(catId, (parCategorie.get(catId) ?? 0) + (n || 0));
    }
  }

  let totalTours = 0, totalSteres = 0, totalM3Plein = 0;
  const categoriesNonConfigurees = new Set<string>();
  const triees = [...categories].sort((a, b) => a.ordre - b.ordre);

  const lignes: LigneTours[] = triees
    .map((c) => {
      const tours = Math.round((parCategorie.get(c.id) ?? 0) * 100) / 100;
      totalTours += tours;
      let steres: number | null = null, m3Plein: number | null = null;
      if (tours > 0) {
        if (c.capaciteTourSteres != null) {
          steres = Math.round(tours * c.capaciteTourSteres * 100) / 100;
          totalSteres += steres;
          m3Plein = Math.round(steres * c.coefficientSterage * 100) / 100;
          totalM3Plein += m3Plein;
        } else {
          categoriesNonConfigurees.add(c.nom);
        }
      }
      return { categorie: c, tours, steres, m3Plein };
    })
    .filter((l) => l.tours > 0 || l.categorie.actif);

  return {
    totalTours: Math.round(totalTours * 100) / 100,
    totalSteres: Math.round(totalSteres * 100) / 100,
    totalM3Plein: Math.round(totalM3Plein * 100) / 100,
    categoriesNonConfigurees: [...categoriesNonConfigurees],
    lignes,
  };
}
