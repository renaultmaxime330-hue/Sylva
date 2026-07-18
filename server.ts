import { createServer } from "http";
import next from "next";

/* Service Next.js unique : un serveur HTTP custom qui porte à la fois les
   Route Handlers (via le request handler Next) et Socket.io — décision prise
   pour éviter un second service (pas de CORS, un seul déploiement Railway).
   ⚠️ Incompatible avec output:"standalone" (non tracé par le build standalone,
   voir node_modules/next/dist/docs/01-app/02-guides/custom-server.md) : build
   `next build` classique + `node`/`tsx` sur ce fichier, jamais en standalone. */

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
// `dir` explicite (pas de dépendance au cwd du process qui le lance — le
// lanceur de prévisualisation exécute depuis le dossier parent du projet).
const app = next({ dev, dir: import.meta.dirname });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Import dynamique fait EXPRÈS après prepare() : lib/server/realtime/io.ts
  // importe (via db/client.ts) lib/server/env.ts, qui valide process.env dès
  // le chargement du module — or c'est prepare() qui charge .env.local. Un
  // import statique en haut de fichier s'exécuterait avant (hissage ES
  // modules), donc avant que les variables d'env existent.
  const { creerIO } = await import("./lib/server/realtime/io");

  const httpServer = createServer((req, res) => { handle(req, res); });
  globalThis.__sylvaIO = creerIO(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Sylva prêt sur http://localhost:${port} (${dev ? "dev" : "prod"})`);
  });
});
