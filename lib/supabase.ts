import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

/* Projet Supabase de l'utilisateur. La clé anon est publique (prévue pour
   le client) — aucun secret ici. */
export const SUPABASE_URL = "https://gdoetknpnbyufyijxtgs.supabase.co";
export const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkb2V0a25wbmJ5dWZ5aWp4dGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzM5NTQsImV4cCI6MjA5OTU0OTk1NH0.yz8ITAuPmAP3_pSNivcDqkgT_zilIycPtXgoZYE5LwI";

let client: SupabaseClient | null = null;

/** Client Supabase, instancié uniquement côté navigateur. */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

/* ---------- Authentification ---------- */

/** Inscription : le rôle et le statut « chef d'entreprise » sont choisis à la création
    du compte et stockés dans les métadonnées de l'utilisateur. */
export async function inscrire(
  email: string,
  password: string,
  profil: { nom: string; role: string; chefEntreprise: boolean }
): Promise<{ session: Session | null; besoinConfirmation: boolean }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Client indisponible");
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { nom: profil.nom, role: profil.role, chef_entreprise: profil.chefEntreprise } },
  });
  if (error) throw new Error(traduireErreur(error.message));
  return { session: data.session, besoinConfirmation: !data.session };
}

export async function connecter(email: string, password: string): Promise<Session> {
  const sb = getSupabase();
  if (!sb) throw new Error("Client indisponible");
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(traduireErreur(error.message));
  if (!data.session) throw new Error("Connexion impossible.");
  return data.session;
}

export async function deconnecter(): Promise<void> {
  const sb = getSupabase();
  await sb?.auth.signOut();
}

export async function sessionActuelle(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** S'abonne aux changements d'état de connexion. Retourne une fonction de désinscription. */
export function surChangementAuth(cb: (session: Session | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

function traduireErreur(m: string): string {
  const l = m.toLowerCase();
  if (l.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (l.includes("already registered")) return "Cet e-mail a déjà un compte — connecte-toi.";
  if (l.includes("password should be at least")) return "Le mot de passe doit faire au moins 6 caractères.";
  if (l.includes("email not confirmed")) return "E-mail non confirmé (voir la configuration Supabase).";
  return m;
}
