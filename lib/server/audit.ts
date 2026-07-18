import { db } from "./db/client";
import { auditLog } from "./db/schema";

/* Trace des actions sensibles : authentification, adhésion/départ d'équipe,
   suppressions (irréversibles). Pas de journalisation systématique de
   chaque création/modification — à l'échelle d'une équipe de 2, ça serait
   du bruit sans valeur, pas de la traçabilité. Ne bloque jamais la requête
   appelante (fire-and-forget, erreurs avalées). */

export type ActionAudit =
  | "auth.register" | "auth.login" | "auth.login_echec" | "auth.logout" | "auth.vol_detecte"
  | "equipe.creation" | "equipe.adhesion" | "equipe.depart"
  | "suppression";

interface ParamsAudit {
  teamId?: string | null;
  userId?: string | null;
  action: ActionAudit;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  req?: Request;
}

function ipDe(req?: Request): string | null {
  if (!req) return null;
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? null;
}

export function tracer(p: ParamsAudit): void {
  db.insert(auditLog).values({
    teamId: p.teamId ?? null,
    userId: p.userId ?? null,
    action: p.action,
    entityType: p.entityType ?? null,
    entityId: p.entityId ?? null,
    meta: p.meta ?? null,
    ip: ipDe(p.req),
  }).catch((err) => console.error("audit_log a échoué :", err));
}
