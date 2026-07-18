/* Rôle métier (abatteur/débardeur) — vocabulaire partagé par les écrans qui
   affichent un rôle (équipe, présence, carte). Le profil réel (nom/rôle/chef
   d'entreprise) vit désormais côté serveur (table users/team_members, voir
   lib/client/auth.ts et lib/client/teams.ts) ; ce fichier ne garde que les
   éléments purs qui n'en dépendent pas. */

export type Role = "abatteur" | "debardeur";

export const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "abatteur", label: "Abatteur", desc: "Tu coupes : chantiers, production, cartes." },
  { value: "debardeur", label: "Débardeur", desc: "Tu débardes : volumes sortis, heures, pistes." },
];

export function roleLabel(r: Role): string {
  return ROLES.find((x) => x.value === r)?.label ?? "Abatteur";
}
