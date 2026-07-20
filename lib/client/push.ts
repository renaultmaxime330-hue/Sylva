"use client";

import { apiFetch } from "./auth";

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64VersUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Sure = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(base64Sure);
  const octets = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i);
  return octets;
}

export function pushSupporte(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!CLE_PUBLIQUE;
}

/** État courant de l'abonnement SUR CET APPAREIL (PC/téléphone/tablette ont
    chacun le leur — un abonnement navigateur n'est jamais partagé entre
    appareils, même pour le même compte). */
export async function abonnementActuel(): Promise<PushSubscription | null> {
  if (!pushSupporte()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function activerPush(): Promise<void> {
  if (!pushSupporte() || !CLE_PUBLIQUE) throw new Error("Notifications push non disponibles sur cet appareil.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Autorisation refusée.");

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64VersUint8Array(CLE_PUBLIQUE),
  });
  const json = sub.toJSON();

  const r = await apiFetch("/api/push", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!r.ok) { await sub.unsubscribe().catch(() => {}); throw new Error("Impossible d'enregistrer l'abonnement."); }
}

export async function desactiverPush(): Promise<void> {
  const sub = await abonnementActuel();
  if (!sub) return;
  await apiFetch("/api/push", {
    method: "DELETE", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe();
}
