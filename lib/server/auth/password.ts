import bcrypt from "bcryptjs";

const COUT = 12;

export function hacherMotDePasse(clair: string): Promise<string> {
  return bcrypt.hash(clair, COUT);
}

export function verifierMotDePasse(clair: string, hash: string): Promise<boolean> {
  return bcrypt.compare(clair, hash);
}
