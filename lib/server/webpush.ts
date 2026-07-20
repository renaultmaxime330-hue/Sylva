import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db/client";
import { pushSubscriptions, teamMembers } from "./db/schema";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:contact@example.com";

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
}

export interface PayloadPush {
  title: string;
  body: string;
  url?: string;
}

/** Envoie une notification push à tous les appareils abonnés des membres de
    l'équipe (PC, téléphone, tablette confondus — un abonnement par appareil).
    Best-effort, fire-and-forget côté appelant : ne bloque jamais la requête
    qui crée l'alerte. Nettoie les abonnements expirés (410/404) au passage. */
export async function envoyerPushEquipe(teamId: string, payload: PayloadPush): Promise<void> {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return; // VAPID non configuré (dev sans .env) — pas de push, pas d'erreur

  const membres = await db.select({ userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
  if (membres.length === 0) return;
  const userIds = membres.map((m) => m.userId);

  const abonnements = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
  if (abonnements.length === 0) return;

  const corps = JSON.stringify(payload);
  const expires: string[] = [];

  await Promise.all(abonnements.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        corps
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) expires.push(s.endpoint);
      else console.error("push a échoué :", err);
    }
  }));

  if (expires.length) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, expires));
  }
}
