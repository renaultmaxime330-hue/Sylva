import type { Server } from "socket.io";

/* Posé sur globalThis par server.ts au démarrage — seul point garanti unique
   entre le module chargé par server.ts et celui chargé par les Route Handlers
   (même précaution que globalThis.__sylvaAuth côté client, voir lib/client/auth.ts). */
declare global {
  // eslint-disable-next-line no-var
  var __sylvaIO: Server | undefined;
}

export type EntiteDonnee =
  | "chantiers" | "clients" | "geometries" | "journees" | "engins" | "entretiens"
  | "materiel" | "finances" | "factures" | "notifs";

/** Prévient l'équipe qu'une donnée a changé, pour invalidation du cache côté
    client. N'échoue jamais silencieusement de façon bruyante : si le serveur
    Socket.io n'est pas démarré (ex. build, script isolé), ne fait rien. */
export function emettreEquipe(teamId: string, entite: EntiteDonnee, id: string, action: "create" | "update" | "delete"): void {
  globalThis.__sylvaIO?.to(`team:${teamId}`).emit("data:changed", { entity: entite, id, action });
}
