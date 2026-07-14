import { getSupabase } from "./supabase";
import { exporterSauvegarde, importerSauvegarde, type ImportResult } from "./backup";

/* Sauvegarde cloud : l'intégralité des données locales est stockée dans
   une ligne (jsonb) de la table `cloud_backups`, protégée par compte. */

const TABLE = "cloud_backups";
const AUTO_KEY = "sylva-cloud-auto";

export async function sauvegarderCloud(): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Client indisponible");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const data = JSON.parse(await exporterSauvegarde());
  const updated_at = new Date().toISOString();
  const { error } = await sb.from(TABLE).upsert({ user_id: user.id, data, updated_at });
  if (error) throw new Error(error.message);
  return updated_at;
}

export async function infoCloud(): Promise<{ updatedAt: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.from(TABLE).select("updated_at").eq("user_id", user.id).maybeSingle();
  if (error || !data) return null;
  return { updatedAt: data.updated_at as string };
}

export async function restaurerCloud(): Promise<ImportResult> {
  const sb = getSupabase();
  if (!sb) throw new Error("Client indisponible");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const { data, error } = await sb.from(TABLE).select("data").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Aucune sauvegarde dans le cloud pour ce compte.");
  return importerSauvegarde(JSON.stringify(data.data));
}

/* ---------- Sauvegarde automatique ---------- */

export function isAutoSave(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(AUTO_KEY) === "1";
}

export function setAutoSave(on: boolean): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(AUTO_KEY, on ? "1" : "0");
}
