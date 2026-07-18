"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ROLES } from "@/lib/profil";
import { IcTree, IcSite, IcMap, IcUsers } from "@/lib/icons";

const ATOUTS = [
  { icon: IcSite, label: "Chantiers, journées et volumes au même endroit" },
  { icon: IcMap, label: "Parcelles dessinées et mesurées sur le terrain" },
  { icon: IcUsers, label: "Toi et ton débardeur, synchronisés en direct" },
];

export default function ConnexionPage() {
  const router = useRouter();
  const { connecter, inscrire } = useAuth();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<"abatteur" | "debardeur">("abatteur");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErreur("");
    try {
      if (mode === "inscription") await inscrire(email.trim(), password, nom.trim(), role);
      else await connecter(email.trim(), password);
      router.push("/");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Échec.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="brand-mark"><IcTree /><span>Sylva</span></div>
        <div className="pitch">
          <h2>Le terrain,<br />organisé.</h2>
          <p>Chantiers, cartes, production et facturation — pensé pour l&apos;abatteur et son débardeur, pas pour un bureau.</p>
          <div className="feats">
            {ATOUTS.map((a) => (
              <div className="feat" key={a.label}>
                <span className="fi"><a.icon /></span>
                <span>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ridge" aria-hidden="true" />
      </div>

      <div className="auth-panel">
        <div className="auth-card stack-gap">
          <div className="titles" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <span style={{ color: "var(--accent)" }}><IcTree /></span>
            </div>
            <h1>Sylva</h1>
            <p className="sub">{mode === "inscription" ? "Crée ton compte" : "Connecte-toi pour continuer"}</p>
          </div>

          <div className="card pad">
            {erreur && (
              <div className="banner" style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger)" }}>
                {erreur}
              </div>
            )}

            <form className="form" onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="cx-email">E-mail</label>
                <input id="cx-email" className="input" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.fr" />
              </div>
              <div className="field">
                <label htmlFor="cx-pass">Mot de passe {mode === "inscription" && <span className="opt">(6 caractères min.)</span>}</label>
                <input id="cx-pass" className="input" type="password" required minLength={6}
                  autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
              </div>

              {mode === "inscription" && (
                <>
                  <div className="field">
                    <label htmlFor="cx-nom">Ton nom</label>
                    <input id="cx-nom" className="input" required value={nom} placeholder="Ex. Maxime"
                      onChange={(e) => setNom(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Ton rôle</label>
                    <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      {ROLES.map((r) => (
                        <button key={r.value} type="button" className={r.value === "abatteur" ? "done" : "doing"}
                          data-on={role === r.value} onClick={() => setRole(r.value)}>{r.label}</button>
                      ))}
                    </div>
                    <span className="hint">{ROLES.find((r) => r.value === role)?.desc}</span>
                  </div>
                </>
              )}

              <button type="submit" className="btn primary big block" disabled={busy}>
                {busy ? "…" : mode === "inscription" ? "Créer mon compte" : "Se connecter"}
              </button>
              <button type="button" className="btn ghost block"
                onClick={() => { setMode(mode === "inscription" ? "connexion" : "inscription"); setErreur(""); }}>
                {mode === "inscription" ? "J'ai déjà un compte" : "Créer un compte"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
