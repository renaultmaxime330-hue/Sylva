"use client";

import { useEffect } from "react";
import { surModifCarte } from "@/lib/canal";
import { creerNotif, rafraichirAlertes } from "@/lib/notifications";
import { synchroniser } from "@/lib/partage";
import { geomTypeInfo, type GeomType } from "@/lib/db";

/* Ouvrier de fond de l'équipe, monté une fois dans le layout (n'affiche rien) :
   — recalcule les alertes locales (entretien / stock / fin de chantier) ;
   — synchronise chantiers & tracés avec l'équipe ;
   — transforme les modifs de carte reçues en alertes, et tire aussitôt les données. */

const ALERTES_MS = 60_000;
const SYNCHRO_MS = 30_000;

/* « Julien a ajouté UNE place de dépôt », « … UN point d'intérêt » */
const ARTICLE: Record<GeomType, string> = {
  parcelle: "une", zone_danger: "une", place_depot: "une",
  point: "un", piste: "une", chemin: "un",
};

export default function EcouteurEquipe() {
  useEffect(() => {
    const sync = () => void synchroniser().catch(() => {});

    void rafraichirAlertes();
    sync();
    const tAlertes = setInterval(() => void rafraichirAlertes(), ALERTES_MS);
    const tSync = setInterval(sync, SYNCHRO_MS);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);

    const stop = surModifCarte((e) => {
      const info = geomTypeInfo(e.typeGeom);
      const verbe = e.action === "ajout" ? "a ajouté" : e.action === "suppression" ? "a supprimé" : "a renommé";
      void creerNotif(
        "carte", `carte:${e.id}`,
        `${e.auteurNom} ${verbe} ${ARTICLE[e.typeGeom] ?? "un"} ${info.label.toLowerCase()}`,
        `Sur ${e.chantierNom}${e.nomGeom ? ` — « ${e.nomGeom} »` : ""}.`,
        `/carte?c=${e.chantierId}`
      );
      sync(); // le coéquipier vient de pousser : on récupère tout de suite
    });

    return () => {
      clearInterval(tAlertes);
      clearInterval(tSync);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      stop();
    };
  }, []);

  return null;
}
