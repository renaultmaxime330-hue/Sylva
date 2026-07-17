import { getSupabase } from "./supabase";

/* Profil de l'utilisateur, choisi à la création du compte et stocké dans
   les métadonnées Supabase (user_metadata). */

export type Role = "abatteur" | "debardeur";

export const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "abatteur", label: "Abatteur", desc: "Tu coupes : chantiers, production, cartes." },
  { value: "debardeur", label: "Débardeur", desc: "Tu débardes : volumes sortis, heures, pistes." },
];

export interface Profil {
  nom: string;
  role: Role;
  chefEntreprise: boolean;
}

export function profilVide(): Profil {
  return { nom: "", role: "abatteur", chefEntreprise: false };
}

/** Profil de l'utilisateur connecté (null si non connecté). */
export async function getProfil(): Promise<Profil | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    nom: typeof m.nom === "string" ? m.nom : (user.email ?? ""),
    role: m.role === "debardeur" ? "debardeur" : "abatteur",
    chefEntreprise: m.chef_entreprise === true,
  };
}

/** Met à jour le profil (nom / rôle / chef d'entreprise). */
export async function majProfil(p: Profil): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Client indisponible");
  const { error } = await sb.auth.updateUser({
    data: { nom: p.nom, role: p.role, chef_entreprise: p.chefEntreprise },
  });
  if (error) throw new Error(error.message);
}

export function roleLabel(r: Role): string {
  return ROLES.find((x) => x.value === r)?.label ?? "Abatteur";
}
