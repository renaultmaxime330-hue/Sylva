import { getSupabase } from "./supabase";
import { getProfil, type Role } from "./profil";

/* Équipes : le chef d'entreprise crée une équipe (il en est propriétaire),
   les autres la rejoignent via un code. Le nom et le rôle viennent du profil
   choisi à la création du compte. Nécessite les tables Supabase `teams`,
   `team_members` + la fonction `rejoindre_equipe` (voir supabase-teams.sql). */

export type { Role };

export interface Equipe {
  id: string;
  nom: string | null;
  code: string;
  owner_id: string;
}

export interface Membre {
  user_id: string;
  role: Role;
  nom: string | null;
}

export interface MonEquipe {
  equipe: Equipe;
  membres: Membre[];
  monRole: Role;
  suisProprietaire: boolean;
}

function genCode(): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += alpha[Math.floor(Math.random() * alpha.length)];
  return c;
}

export async function creerEquipe(nomEquipe: string): Promise<Equipe> {
  const sb = getSupabase();
  if (!sb) throw new Error("Client indisponible");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Connecte-toi d'abord");
  const profil = await getProfil();

  let dernierErr = "";
  for (let essai = 0; essai < 5; essai++) {
    const code = genCode();
    const { data, error } = await sb.from("teams").insert({ owner_id: user.id, nom: nomEquipe || null, code }).select().single();
    if (!error && data) {
      await sb.from("team_members").insert({
        team_id: data.id, user_id: user.id,
        role: profil?.role ?? "abatteur", nom: profil?.nom ?? null,
      });
      return data as Equipe;
    }
    dernierErr = error?.message ?? "";
    if (!dernierErr.toLowerCase().includes("duplicate")) break; // erreur autre que collision de code
  }
  throw new Error(dernierErr || "Impossible de créer l'équipe.");
}

export async function rejoindreEquipe(code: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Client indisponible");
  const profil = await getProfil();
  const { error } = await sb.rpc("rejoindre_equipe", {
    p_code: code.trim().toUpperCase(),
    p_nom: profil?.nom ?? null,
    p_role: profil?.role ?? "debardeur",
  });
  if (error) throw new Error(error.message.includes("invalide") ? "Code d'équipe invalide." : error.message);
}

export async function monEquipe(): Promise<MonEquipe | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: mem } = await sb.from("team_members").select("team_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (!mem) return null;
  const { data: equipe } = await sb.from("teams").select("*").eq("id", mem.team_id).maybeSingle();
  if (!equipe) return null;
  const { data: membres } = await sb.from("team_members").select("user_id, role, nom").eq("team_id", mem.team_id);
  return {
    equipe: equipe as Equipe,
    membres: (membres ?? []) as Membre[],
    monRole: mem.role as Role,
    suisProprietaire: (equipe as Equipe).owner_id === user.id,
  };
}

export async function quitterEquipe(teamId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("team_members").delete().eq("team_id", teamId).eq("user_id", user.id);
}
