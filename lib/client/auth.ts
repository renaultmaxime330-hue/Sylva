"use client";

/* Jeton d'accès gardé UNIQUEMENT en mémoire (jamais localStorage — voir le
   plan de migration). Perdu au rechargement de page, restauré via un
   rafraîchissement silencieux contre le cookie httpOnly sylva_rt.

   ⚠️ Stocké sur `globalThis`, PAS dans une simple variable de module : vérifié
   empiriquement que Turbopack peut instancier ce fichier plusieurs fois côté
   navigateur selon le chemin d'import (une copie pour AuthProvider, une autre
   pour lib/chantiers.ts…) — une variable de module n'est alors PAS partagée
   entre ces copies, et le jeton posé par l'une reste invisible à l'autre.
   `globalThis` est le seul point garanti unique dans ce contexte. */

interface EtatAuthGlobal {
  accessToken: string | null;
  ecouteurs: Set<(t: string | null) => void>;
  rafraichissementEnCours: Promise<string | null> | null;
}
declare global {
  // eslint-disable-next-line no-var
  var __sylvaAuth: EtatAuthGlobal | undefined;
}

function etat(): EtatAuthGlobal {
  if (!globalThis.__sylvaAuth) {
    globalThis.__sylvaAuth = { accessToken: null, ecouteurs: new Set(), rafraichissementEnCours: null };
  }
  return globalThis.__sylvaAuth;
}

function definirToken(t: string | null) {
  const e = etat();
  e.accessToken = t;
  for (const cb of e.ecouteurs) cb(t);
}

export function jetonActuel(): string | null {
  return etat().accessToken;
}

export function surChangementJeton(cb: (t: string | null) => void): () => void {
  etat().ecouteurs.add(cb);
  return () => etat().ecouteurs.delete(cb);
}

export interface UtilisateurClient {
  id: string;
  email: string;
  nom: string;
  role: "abatteur" | "debardeur";
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

export async function inscrire(
  email: string, password: string, nom: string, role: "abatteur" | "debardeur"
): Promise<UtilisateurClient> {
  const r = await fetch("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, nom, role }), credentials: "include",
  });
  if (!r.ok) await lireErreur(r, "Échec de l'inscription.");
  const d = await r.json();
  definirToken(d.accessToken);
  return d.user;
}

export async function connecter(email: string, password: string): Promise<UtilisateurClient> {
  const r = await fetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }), credentials: "include",
  });
  if (!r.ok) await lireErreur(r, "Échec de la connexion.");
  const d = await r.json();
  definirToken(d.accessToken);
  return d.user;
}

export async function deconnecter(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
  definirToken(null);
}

export async function changerRole(role: "abatteur" | "debardeur"): Promise<void> {
  const r = await fetch("/api/auth/me", {
    method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${jetonActuel()}` },
    body: JSON.stringify({ role }), credentials: "include",
  });
  if (!r.ok) await lireErreur(r, "Impossible de changer de rôle.");
}

/* Le rafraîchissement fait une ROTATION à usage unique côté serveur (voir
   /api/auth/refresh) : présenter deux fois le même cookie déclenche la
   détection de vol et coupe toute la session. Or plusieurs appels concurrents
   sont normaux ici (StrictMode en dev remonte les effets, plusieurs appels
   API peuvent recevoir un 401 au même instant) — on mutualise donc les
   rafraîchissements concurrents sur UNE seule requête réseau. */
function rafraichirToken(): Promise<string | null> {
  const e = etat();
  if (!e.rafraichissementEnCours) {
    e.rafraichissementEnCours = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (r) => {
        if (!r.ok) { definirToken(null); return null; }
        const d = await r.json();
        definirToken(d.accessToken);
        return d.accessToken as string;
      })
      .catch(() => { definirToken(null); return null; })
      .finally(() => { e.rafraichissementEnCours = null; });
  }
  return e.rafraichissementEnCours;
}

/** Tente de restaurer la session au chargement, via le cookie httpOnly. */
export async function rafraichirSilencieux(): Promise<UtilisateurClient | null> {
  const token = await rafraichirToken();
  if (!token) return null;
  const me = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  if (!me.ok) { definirToken(null); return null; }
  return (await me.json()).user;
}

/** fetch() authentifié : ajoute le Bearer, retente une fois après un rafraîchissement si 401.
    Tente le rafraîchissement même si on n'avait pas encore de jeton (premier
    appel juste après un chargement de page, avant que le cookie n'ait été
    échangé) — pas seulement quand un jeton périmé vient d'échouer. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const executer = () => fetch(path, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(etat().accessToken ? { Authorization: `Bearer ${etat().accessToken}` } : {}) },
    credentials: "include",
  });
  let res = await executer();
  if (res.status === 401) {
    const token = await rafraichirToken();
    if (token) res = await executer();
  }
  return res;
}
