/* Limitation de débit en mémoire — suffisant pour une seule instance
   (voir le plan : Redis explicitement différé à cette échelle). Fenêtre
   glissante simple : compte les tentatives sur les 15 dernières minutes. */

const FENETRE_MS = 15 * 60 * 1000;
// Par compte : 5, aligné sur le verrouillage de compte (users.lockedUntil).
// Par IP : plus large — une équipe de 2 peut partager un même wifi de chantier,
// et un cumul d'essais légitimes ne doit pas bloquer tout le monde ; l'IP sert
// surtout à ralentir un bourrage d'identifiants sur BEAUCOUP de comptes différents.
const MAX_PAR_CLE: Record<string, number> = { email: 5, ip: 20 };

declare global {
  // eslint-disable-next-line no-var
  var __sylvaRateLimit: Map<string, number[]> | undefined;
}

const tentatives = globalThis.__sylvaRateLimit ?? new Map<string, number[]>();
globalThis.__sylvaRateLimit = tentatives;

/** true si la limite est dépassée pour cette clé, ex. "login:email:<email>" ou "login:ip:<ip>". */
export function limiteAtteinte(cle: string): boolean {
  const maintenant = Date.now();
  const liste = (tentatives.get(cle) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  tentatives.set(cle, liste);
  const max = cle.includes(":ip:") ? MAX_PAR_CLE.ip : MAX_PAR_CLE.email;
  return liste.length >= max;
}

export function enregistrerTentative(cle: string): void {
  const maintenant = Date.now();
  const liste = (tentatives.get(cle) ?? []).filter((t) => maintenant - t < FENETRE_MS);
  liste.push(maintenant);
  tentatives.set(cle, liste);
}

export function reinitialiserTentatives(cle: string): void {
  tentatives.delete(cle);
}
