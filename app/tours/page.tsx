"use client";

import Link from "next/link";
import { useJournees } from "@/lib/queries/journees";
import { useTourCategories } from "@/lib/queries/tourCategories";
import { filtrePeriode } from "@/lib/production";
import { agregerTours } from "@/lib/tourCategories";
import TourCategoriesManager from "@/components/TourCategoriesManager";
import { IcLogs, IcChart, IcWarning, IcChevron } from "@/lib/icons";

export default function ToursPage() {
  const { data: journees } = useJournees();
  const { data: categories } = useTourCategories();

  return (
    <div className="stack-gap">
      <div className="page-head">
        <div className="titles">
          <p className="eyebrow">Débardage</p>
          <h1>Tours de porteur</h1>
          <p className="sub">Catégories de qualité, capacité du porteur et calcul du volume stéré.</p>
        </div>
        <div className="actions">
          <Link href="/production" className="btn big">Journal de production <IcChevron /></Link>
        </div>
      </div>

      {/* Méthode de calcul */}
      <div className="card pad">
        <h3 className="sec-title"><span className="sec-ic"><IcChart /></span> Méthode de calcul du stérage</h3>
        <div className="tourcalc-steps">
          <div className="tourcalc-step">
            <b>1. Tours → stères</b>
            <p>Chaque tour plein transporte une capacité fixe (en stères, volume apparent) qui dépend du porteur
              <i> et</i> de la catégorie de bois — elle se règle par catégorie ci-dessous.</p>
            <code>tours × capacité (stères/tour) = volume apparent (stères)</code>
          </div>
          <div className="tourcalc-step">
            <b>2. Stères → m³ de bois plein</b>
            <p>Le bois empilé laisse des vides — un coefficient de foisonnement (~0,7 en usage courant,
              éditable par catégorie selon l&apos;essence) convertit le volume apparent en volume réel.</p>
            <code>stères × coefficient = m³ de bois plein</code>
          </div>
        </div>
      </div>

      {categories && journees && <RecapPeriodes journees={journees} categories={categories} />}

      <TourCategoriesManager />
    </div>
  );
}

function RecapPeriodes({
  journees, categories,
}: {
  journees: NonNullable<ReturnType<typeof useJournees>["data"]>;
  categories: NonNullable<ReturnType<typeof useTourCategories>["data"]>;
}) {
  const semaine = agregerTours(filtrePeriode(journees, "semaine"), categories);
  const annee = agregerTours(filtrePeriode(journees, "annee"), categories);

  if (annee.totalTours === 0) return null;

  return (
    <>
      <div className="stats">
        <div className="stat"><div className="k"><IcLogs /> Tours (semaine)</div><div className="v">{semaine.totalTours.toLocaleString("fr-FR")}</div></div>
        <div className="stat"><div className="k"><IcLogs /> Stères (semaine)</div><div className="v">{semaine.totalSteres.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>st</small></div></div>
        <div className="stat"><div className="k"><IcLogs /> Tours (année)</div><div className="v">{annee.totalTours.toLocaleString("fr-FR")}</div></div>
        <div className="stat"><div className="k"><IcLogs /> Stères (année)</div><div className="v">{annee.totalSteres.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>st</small></div></div>
        <div className="stat"><div className="k"><IcChart /> m³ plein (année)</div><div className="v">{annee.totalM3Plein.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}<small>m³</small></div></div>
      </div>

      {annee.categoriesNonConfigurees.length > 0 && (
        <div className="banner warn">
          <IcWarning />
          <span>
            Capacité non configurée pour {annee.categoriesNonConfigurees.join(", ")} — les tours sont comptés
            mais leur volume n&apos;est pas encore estimé.
          </span>
        </div>
      )}

      <div className="card pad">
        <h3 className="sec-title" style={{ marginBottom: 12 }}>Répartition (année)</h3>
        <div className="tourcat-recap">
          {annee.lignes.filter((l) => l.tours > 0).map((l) => (
            <div className="tourcat-recap-row" key={l.categorie.id}>
              <span className="tourcat-recap-dot" style={{ background: l.categorie.couleur }} />
              <span className="tourcat-recap-nom">{l.categorie.nom}</span>
              <span className="tourcat-recap-tours">{l.tours.toLocaleString("fr-FR")} tour{l.tours > 1 ? "s" : ""}</span>
              <span className="tourcat-recap-vol">
                {l.steres != null ? `${l.steres.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} st` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
