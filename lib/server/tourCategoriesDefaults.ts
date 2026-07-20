/** Catégories de qualité de bois proposées à la création d'une équipe —
    point de départ éditable (renommage/ajout/suppression), pas un référentiel
    figé : reprend les deux catégories déjà utilisées (Pins/Autres essences)
    pour ne pas perdre l'historique, plus les qualités de tri courantes en
    exploitation forestière (Canter, Caisse, Trituration, Chauffage). */
export const CATEGORIES_TOURS_DEFAUT: { nom: string; couleur: string; ordre: number }[] = [
  { nom: "Pins", couleur: "#2E6B41", ordre: 0 },
  { nom: "Autres essences", couleur: "#6B7280", ordre: 1 },
  { nom: "Canter", couleur: "#A75F24", ordre: 2 },
  { nom: "Caisse", couleur: "#8E44AD", ordre: 3 },
  { nom: "Trituration", couleur: "#2563EB", ordre: 4 },
  { nom: "Chauffage", couleur: "#C0392B", ordre: 5 },
];
