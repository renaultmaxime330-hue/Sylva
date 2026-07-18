import type { Server as HttpServer } from "http";
import { randomUUID } from "crypto";
import { Server, type Socket } from "socket.io";
import { verifierAcces } from "../auth/tokens";
import { equipeDeUtilisateur } from "../auth/contexte";

/* Un service Next.js unique : ce module attache Socket.io au même serveur
   HTTP que les Route Handlers (voir server.ts). Une salle par équipe
   (`team:<teamId>`), jointe après un handshake authentifié par JWT — le
   serveur revérifie toujours l'appartenance en base, ne fait jamais confiance
   à un teamId envoyé par le client. */

interface DonneesSocket {
  userId: string;
  nom: string;
  role: "abatteur" | "debardeur";
  teamId: string;
}

interface EntreePresence {
  nom: string;
  role: "abatteur" | "debardeur";
  sockets: Set<string>;
}

/** Qui est en ligne, par équipe. Une seule instance à cette échelle — pas
    d'adaptateur Redis (délibérément différé, voir le plan de migration). */
const presenceParEquipe = new Map<string, Map<string, EntreePresence>>();

function salle(teamId: string): string {
  return `team:${teamId}`;
}

export function creerIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") return next(new Error("unauthorized"));
    const payload = verifierAcces(token);
    if (!payload) return next(new Error("unauthorized"));
    const teamId = await equipeDeUtilisateur(payload.sub);
    if (!teamId) return next(new Error("no-team"));
    const donnees: DonneesSocket = { userId: payload.sub, nom: payload.nom, role: payload.role, teamId };
    socket.data = donnees;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const { userId, nom, role, teamId } = socket.data as DonneesSocket;
    const room = salle(teamId);
    void socket.join(room);

    let membres = presenceParEquipe.get(teamId);
    if (!membres) { membres = new Map(); presenceParEquipe.set(teamId, membres); }
    let entree = membres.get(userId);
    const premiereConnexion = !entree;
    if (!entree) { entree = { nom, role, sockets: new Set() }; membres.set(userId, entree); }
    entree.sockets.add(socket.id);

    // Aperçu immédiat pour le nouvel arrivant — sinon il ne verrait ses
    // coéquipiers qu'à leur prochain événement.
    socket.emit("presence:snapshot", [...membres.entries()]
      .filter(([id]) => id !== userId)
      .map(([id, m]) => ({ userId: id, nom: m.nom, role: m.role })));

    if (premiereConnexion) socket.to(room).emit("presence:join", { userId, nom, role });

    socket.on("pos:update", (p: { lat?: unknown; lng?: unknown; precisionM?: unknown }) => {
      if (typeof p?.lat !== "number" || typeof p?.lng !== "number") return;
      socket.to(room).emit("pos:update", {
        userId, nom, role,
        lat: p.lat, lng: p.lng,
        precisionM: typeof p.precisionM === "number" ? p.precisionM : null,
        at: new Date().toISOString(),
      });
    });

    socket.on("carte:evenement", (e: {
      action?: unknown; typeGeom?: unknown; nomGeom?: unknown; chantierId?: unknown; chantierNom?: unknown;
    }) => {
      if (typeof e?.action !== "string" || typeof e?.chantierId !== "string") return;
      socket.to(room).emit("carte:evenement", {
        id: randomUUID(),
        auteurId: userId, auteurNom: nom, role,
        action: e.action,
        typeGeom: e.typeGeom,
        nomGeom: typeof e.nomGeom === "string" ? e.nomGeom : "",
        chantierId: e.chantierId,
        chantierNom: typeof e.chantierNom === "string" ? e.chantierNom : "",
        at: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      const m = presenceParEquipe.get(teamId);
      const en = m?.get(userId);
      if (!en) return;
      en.sockets.delete(socket.id);
      if (en.sockets.size === 0) {
        m!.delete(userId);
        socket.to(room).emit("presence:leave", { userId });
      }
    });
  });

  return io;
}
