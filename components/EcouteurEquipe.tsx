"use client";

import { useEffect } from "react";
import { surEvenement } from "@/lib/client/socket";
import { queryClient } from "@/lib/client/queryClient";
import { creerNotif } from "@/lib/notifications";
import { geomTypeInfo, type GeomType } from "@/lib/db";

/* Ouvrier de fond de l'équipe, monté une fois dans le layout (n'affiche rien) :
   — invalide le cache React Query quand un coéquipier modifie une donnée
     (data:changed, émis par les routes de mutation, voir lib/server/realtime/emit.ts) ;
   — transforme les modifs de carte reçues (carte:evenement) en alertes.
   TODO Phase 8 : recalcul serveur des alertes déduites (entretien/stock/chantier
   terminé) — remplace l'ancien rafraichirAlertes() en polling local. */

/* « Julien a ajouté UNE place de dépôt », « … UN point d'intérêt » */
const ARTICLE: Record<GeomType, string> = {
  parcelle: "une", zone_danger: "une", place_depot: "une",
  point: "un", piste: "une", chemin: "un",
};

interface EvenementCarte {
  id: string;
  auteurId: string;
  auteurNom: string;
  role: "abatteur" | "debardeur";
  action: "ajout" | "suppression" | "renommage";
  typeGeom: GeomType;
  nomGeom: string;
  chantierId: string;
  chantierNom: string;
  at: string;
}

interface DonneeChangee {
  entity: string;
  id: string;
  action: "create" | "update" | "delete";
}

export default function EcouteurEquipe() {
  useEffect(() => {
    const offDonnees = surEvenement<DonneeChangee>("data:changed", (e) => {
      void queryClient.invalidateQueries({ queryKey: [e.entity] });
    });

    const offCarte = surEvenement<EvenementCarte>("carte:evenement", (e) => {
      const info = geomTypeInfo(e.typeGeom);
      const verbe = e.action === "ajout" ? "a ajouté" : e.action === "suppression" ? "a supprimé" : "a renommé";
      void creerNotif(
        "carte", `carte:${e.id}`,
        `${e.auteurNom} ${verbe} ${ARTICLE[e.typeGeom] ?? "un"} ${info.label.toLowerCase()}`,
        `Sur ${e.chantierNom}${e.nomGeom ? ` — « ${e.nomGeom} »` : ""}.`,
        `/carte?c=${e.chantierId}`
      );
    });

    return () => { offDonnees(); offCarte(); };
  }, []);

  return null;
}
