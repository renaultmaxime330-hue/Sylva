"use client";

import { apiFetch } from "./auth";

export type Role = "abatteur" | "debardeur";

export interface Equipe {
  id: string;
  ownerId: string;
  nom: string | null;
  code: string;
  createdAt: string;
}

export interface Membre {
  teamId: string;
  userId: string;
  role: Role;
  chefEntreprise: boolean;
  nom: string | null;
  joinedAt: string;
}

export interface MonEquipe {
  equipe: Equipe;
  membres: Membre[];
  monRole: Role;
  monChefEntreprise: boolean;
  suisProprietaire: boolean;
}

async function lireErreur(r: Response, defaut: string): Promise<never> {
  const d = await r.json().catch(() => null);
  throw new Error(d?.erreur ?? defaut);
}

export async function monEquipe(): Promise<MonEquipe | null> {
  const r = await apiFetch("/api/teams/me");
  if (!r.ok) return null;
  const d = await r.json();
  return d.equipe ? d : null;
}

export async function creerEquipe(nom: string): Promise<Equipe> {
  const r = await apiFetch("/api/teams", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom }),
  });
  if (!r.ok) await lireErreur(r, "Impossible de créer l'équipe.");
  return (await r.json()).equipe;
}

export async function rejoindreEquipe(code: string): Promise<void> {
  const r = await apiFetch("/api/teams/join", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
  });
  if (!r.ok) await lireErreur(r, "Impossible de rejoindre l'équipe.");
}

export async function quitterEquipe(): Promise<void> {
  await apiFetch("/api/teams/me", { method: "DELETE" });
}
