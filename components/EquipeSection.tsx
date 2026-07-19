"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { creerEquipe, rejoindreEquipe, quitterEquipe, definirChefEquipe } from "@/lib/client/teams";
import { useMonEquipe } from "@/lib/queries/equipe";
import { roleLabel } from "@/lib/profil";
import { IcUsers, IcCheck, IcSite, IcTruck } from "@/lib/icons";

export default function EquipeSection() {
  const { utilisateur, pret } = useAuth();
  const { data: eq, isLoading: chargement } = useMonEquipe();
  const [mode, setMode] = useState<"creer" | "rejoindre">("creer");
  const [nomEquipe, setNomEquipe] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function flash(t: string) { setMsg(t); setErr(""); setTimeout(() => setMsg(""), 4000); }

  async function onCreer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await creerEquipe(nomEquipe.trim()); flash("Équipe créée ✓"); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : "Échec."); }
    finally { setBusy(false); }
  }
  async function onRejoindre(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await rejoindreEquipe(code.trim()); flash("Tu as rejoint l'équipe ✓"); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : "Échec."); }
    finally { setBusy(false); }
  }
  async function onQuitter() {
    if (!eq || !confirm("Quitter cette équipe ?")) return;
    setBusy(true);
    try { await quitterEquipe(); flash("Équipe quittée."); }
    finally { setBusy(false); }
  }
  async function onToggleChef(userId: string, chef: boolean) {
    setBusy(true); setErr("");
    try { await definirChefEquipe(userId, chef); flash(chef ? "Nommé chef d'entreprise ✓" : "Statut de chef retiré."); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : "Échec."); }
    finally { setBusy(false); }
  }

  return (
    <div className="card pad">
      <h3 className="sec-title" style={{ marginBottom: 6 }}><span className="sec-ic"><IcUsers /></span> Mon équipe (abatteur / débardeur)</h3>
      <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
        Relie ton compte à celui de ton débardeur pour travailler ensemble sur les mêmes chantiers.
      </p>

      {msg && <div className="banner" style={{ marginBottom: 14 }}><IcCheck /> {msg}</div>}
      {err && <div className="banner" style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger)" }}>{err}</div>}

      {!pret || chargement ? (
        <p className="muted">…</p>
      ) : !utilisateur ? (
        <p className="muted" style={{ fontSize: 14.5 }}>Connecte-toi d&apos;abord pour utiliser les équipes.</p>
      ) : eq ? (
        <>
          <div className="info-grid" style={{ marginBottom: 16 }}>
            <div className="info-cell"><span className="k">Équipe</span><span className="v">{eq.equipe.nom || "Mon équipe"}</span></div>
            <div className="info-cell"><span className="k">Code de partage</span><span className="v mono" style={{ letterSpacing: ".1em", fontSize: 20, color: "var(--accent-strong)" }}>{eq.equipe.code}</span></div>
            <div className="info-cell"><span className="k">Mon rôle</span><span className="v">{roleLabel(eq.monRole)}{eq.monChefEntreprise ? " · Chef d'entreprise" : ""}</span></div>
          </div>
          {eq.suisProprietaire && (
            <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
              Donne le code <b style={{ color: "var(--text)" }}>{eq.equipe.code}</b> à ton coéquipier : il crée son compte, puis « Rejoindre une équipe » avec ce code.
            </p>
          )}

          <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", fontWeight: 700, marginBottom: 10 }}>Membres ({eq.membres.length})</h4>
          <div className="list" style={{ marginBottom: 16 }}>
            {eq.membres.map((m) => (
              <div className="jrow" key={m.userId}>
                <div className="glyph" style={{ width: 42, height: 42, borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  {m.role === "abatteur" ? <IcSite /> : <IcTruck />}
                </div>
                <div className="jbody">
                  <div className="t">{m.nom || "Sans nom"}</div>
                  <div className="m muted">{roleLabel(m.role)}{m.chefEntreprise ? " · Chef d'entreprise" : ""}</div>
                </div>
                {eq.monChefEntreprise && (
                  <div className="jactions">
                    <button className="btn ghost" disabled={busy} onClick={() => onToggleChef(m.userId, !m.chefEntreprise)}>
                      {m.chefEntreprise ? "Retirer chef" : "Nommer chef"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn ghost" onClick={onQuitter} disabled={busy}>Quitter l&apos;équipe</button>
        </>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 14 }}>
            Tu apparaîtras dans l&apos;équipe en tant que <b style={{ color: "var(--text)" }}>{utilisateur.nom}</b> — {roleLabel(utilisateur.role)}.
          </p>

          <div className="seg-mini wide" style={{ marginBottom: 16 }}>
            <button data-on={mode === "creer"} onClick={() => setMode("creer")}>Créer une équipe</button>
            <button data-on={mode === "rejoindre"} onClick={() => setMode("rejoindre")}>Rejoindre une équipe</button>
          </div>

          {mode === "creer" ? (
            <form className="form" onSubmit={onCreer} style={{ maxWidth: 460 }}>
              <div className="field">
                <label htmlFor="eqn">Nom de l&apos;équipe <span className="opt">(optionnel)</span></label>
                <input id="eqn" className="input" value={nomEquipe} placeholder="Ex. Chantiers Renault" onChange={(e) => setNomEquipe(e.target.value)} />
              </div>
              <button type="submit" className="btn primary big" disabled={busy}>{busy ? "…" : "Créer mon équipe"}</button>
            </form>
          ) : (
            <form className="form" onSubmit={onRejoindre} style={{ maxWidth: 460 }}>
              <div className="field">
                <label htmlFor="code">Code de l&apos;équipe</label>
                <input id="code" className="input mono" style={{ letterSpacing: ".1em", textTransform: "uppercase" }} required value={code} placeholder="Ex. K7P2QX" onChange={(e) => setCode(e.target.value)} />
              </div>
              <button type="submit" className="btn primary big" disabled={busy || !code.trim()}>{busy ? "…" : "Rejoindre l'équipe"}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
