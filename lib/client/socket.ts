"use client";

import { io, type Socket } from "socket.io-client";
import { jetonActuel, surChangementJeton } from "./auth";

/* Connexion Socket.io unique de l'onglet, partagée par tout ce qui a besoin de
   temps réel (présence/position, modifs de carte, invalidation de cache).
   Sur `globalThis` comme le reste de l'état client — même précaution que
   lib/client/auth.ts (Turbopack peut instancier ce module plusieurs fois). */

interface EtatSocketGlobal {
  socket: Socket | null;
}
declare global {
  // eslint-disable-next-line no-var
  var __sylvaSocket: EtatSocketGlobal | undefined;
}

function etat(): EtatSocketGlobal {
  if (!globalThis.__sylvaSocket) globalThis.__sylvaSocket = { socket: null };
  return globalThis.__sylvaSocket;
}

/** Connexion paresseuse : ne s'établit qu'au premier écouteur/envoi, avec un
    jeton toujours frais (callback réévalué à CHAQUE tentative de connexion —
    pas un objet statique figé au premier appel).

    ⚠️ EcouteurEquipe s'abonne une seule fois au montage du layout racine, qui
    ne se remonte PAS lors d'une navigation côté client (connexion → tableau
    de bord après un login réussi, par ex.) : si on refusait de créer la
    connexion faute de jeton au tout premier appel, elle ne serait alors
    JAMAIS retentée par la suite, même une fois authentifié. On crée donc la
    connexion tout de suite dans tous les cas — le serveur la rejette si le
    jeton est absent/invalide, et le rappel ci-dessous force une reconnexion
    immédiate dès qu'un jeton apparaît, sans attendre le prochain backoff. */
function assurerConnexion(): Socket {
  const e = etat();
  if (e.socket) return e.socket;
  e.socket = io({ auth: (cb) => cb({ token: jetonActuel() }) });
  return e.socket;
}

surChangementJeton((t) => {
  const e = etat();
  if (!t) {
    if (e.socket) { e.socket.disconnect(); e.socket = null; }
    return;
  }
  if (e.socket && !e.socket.connected) e.socket.connect();
});

/** Force une reconnexion avec le jeton courant — utilisé après un changement
    de rôle : la connexion active garde le rôle du handshake d'origine tant
    qu'elle n'est pas recyclée (surChangementJeton ne reconnecte que si déjà
    déconnecté), donc les coéquipiers verraient l'ancien rôle jusqu'à la
    prochaine coupure sinon. */
export function reconnecter(): void {
  const s = etat().socket;
  if (s) { s.disconnect(); s.connect(); }
}

/** Émet un événement vers le serveur (relayé à l'équipe côté io.ts). */
export function emettre(event: string, donnees: unknown): void {
  assurerConnexion().emit(event, donnees);
}

/** Écoute un événement (serveur → client). Retourne la fonction de désinscription. */
export function surEvenement<T = unknown>(event: string, cb: (donnees: T) => void): () => void {
  const s = assurerConnexion();
  s.on(event, cb as (...args: unknown[]) => void);
  return () => { s.off(event, cb as (...args: unknown[]) => void); };
}
