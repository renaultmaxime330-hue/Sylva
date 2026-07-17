/* Coordonnées de l'entreprise (émetteur des devis/factures), stockées localement. */

export interface Entreprise {
  nom: string;
  adresse: string;
  siret: string;
  telephone: string;
  email: string;
  mentionTVA: string; // ex. "TVA non applicable, art. 293 B du CGI"
}

const KEY = "sylva-entreprise";

export function entrepriseVide(): Entreprise {
  return { nom: "", adresse: "", siret: "", telephone: "", email: "", mentionTVA: "TVA non applicable, art. 293 B du CGI" };
}

export function getEntreprise(): Entreprise {
  if (typeof localStorage === "undefined") return entrepriseVide();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...entrepriseVide(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return entrepriseVide();
}

export function setEntreprise(e: Entreprise): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(e));
}
