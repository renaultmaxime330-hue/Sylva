import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env";
import * as schema from "./schema";

/* Pool de connexions, instancié une seule fois (réutilisé entre les
   requêtes — recréer un Pool par requête épuiserait les connexions
   Postgres de Railway en quelques secondes). */

declare global {
  // eslint-disable-next-line no-var
  var __sylvaPool: Pool | undefined;
}

const pool = globalThis.__sylvaPool ?? new Pool({ connectionString: env.DATABASE_URL, max: 10 });
if (env.NODE_ENV !== "production") globalThis.__sylvaPool = pool;

export const db = drizzle(pool, { schema });
