"use client";

import { useEffect, useState } from "react";
import {
  inscrire, connecter, deconnecter, sessionActuelle, surChangementAuth,
} from "@/lib/supabase";
import {
  sauvegarderCloud, restaurerCloud, infoCloud, isAutoSave, setAutoSave,
} from "@/lib/cloudsync";
import { IcCloud, IcCheck, IcDownload, IcUpload } from "@/lib/icons";

function formatQuand(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " à " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function CloudSection() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [lastCloud, setLastCloud] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    setAuto(isAutoSave());
    sessionActuelle().then((s) => { setEmail(s?.user.email ?? ""); setChecking(false); if (s) infoCloud().then((i) => setLastCloud(i?.updatedAt ?? null)); });
    const unsub = surChangementAuth((s) => {
      setEmail(s?.user.email ?? "");
      if (s) infoCloud().then((i) => setLastCloud(i?.updatedAt ?? null));
    });
    return unsub;
  }, []);

  function flash(t: string) { setMsg(t); setErr(""); setTimeout(() => setMsg(""), 5000); }
  function fail(t: string) { setErr(t); setMsg(""); }

  async function onAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    try {
      if (mode === "signup") {
        const { besoinConfirmation } = await inscrire(emailInput.trim(), password);
        if (besoinConfirmation) { flash("Compte créé. Confirme ton e-mail, puis connecte-toi."); setMode("signin"); }
        else flash("Compte créé et connecté ✓");
      } else {
        await connecter(emailInput.trim(), password);
        flash("Connecté ✓");
      }
      setPassword("");
    } catch (e) { fail(e instanceof Error ? e.message : "Échec."); }
    finally { setBusy(false); }
  }

  async function onSauvegarder() {
    setBusy(true); setErr("");
    try { const at = await sauvegarderCloud(); setLastCloud(at); flash("Sauvegardé dans le cloud ✓"); }
    catch (e) { fail(e instanceof Error ? e.message : "Échec de la sauvegarde."); }
    finally { setBusy(false); }
  }

  async function onRestaurer() {
    if (!confirm("Restaurer depuis le cloud ?\nLes données du cloud seront ajoutées / mises à jour sur cet appareil.")) return;
    setBusy(true); setErr("");
    try { const r = await restaurerCloud(); flash(`Restauré : ${r.chantiers} chantiers, ${r.journees} journées, ${r.geometries} tracés, ${r.photos} photos.`); }
    catch (e) { fail(e instanceof Error ? e.message : "Échec de la restauration."); }
    finally { setBusy(false); }
  }

  async function onToggleAuto() {
    const next = !auto;
    setAuto(next); setAutoSave(next);
    if (next) { try { const at = await sauvegarderCloud(); setLastCloud(at); flash("Sauvegarde auto activée ✓"); } catch { /* ignore */ } }
  }

  async function onSignOut() { await deconnecter(); setEmail(""); setLastCloud(null); }

  return (
    <div className="card pad">
      <h3 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><IcCloud /> Synchronisation cloud</h3>

      {msg && <div className="banner" style={{ marginBottom: 14 }}><IcCheck /> {msg}</div>}
      {err && <div className="banner" style={{ marginBottom: 14, background: "var(--danger-bg)", color: "var(--danger)", borderColor: "var(--danger)" }}>{err}</div>}

      {checking ? (
        <p className="muted">…</p>
      ) : email ? (
        <>
          <p className="muted" style={{ fontSize: 14.5, marginBottom: 4 }}>
            Connecté en tant que <b style={{ color: "var(--text)" }}>{email}</b>.
          </p>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
            {lastCloud ? `Dernière sauvegarde cloud : ${formatQuand(lastCloud)}.` : "Aucune sauvegarde cloud pour l'instant."}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <button className="btn primary big" onClick={onSauvegarder} disabled={busy}><IcUpload /> Sauvegarder dans le cloud</button>
            <button className="btn big" onClick={onRestaurer} disabled={busy}><IcDownload /> Restaurer depuis le cloud</button>
          </div>

          <label className="switch">
            <input type="checkbox" checked={auto} onChange={onToggleAuto} />
            <span>Sauvegarde automatique (toutes les 2 min et à chaque connexion)</span>
          </label>

          <div style={{ marginTop: 16 }}>
            <button className="btn ghost" onClick={onSignOut}>Se déconnecter</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 14.5, marginBottom: 16 }}>
            Connecte-toi pour sauvegarder tes données en ligne et les retrouver sur tous tes appareils.
          </p>
          <form className="form" onSubmit={onAuth} style={{ maxWidth: 420 }}>
            <div className="field">
              <label htmlFor="cemail">E-mail</label>
              <input id="cemail" className="input" type="email" required value={emailInput} autoComplete="email"
                onChange={(e) => setEmailInput(e.target.value)} placeholder="ton@email.fr" />
            </div>
            <div className="field">
              <label htmlFor="cpass">Mot de passe {mode === "signup" && <span className="opt">(6 caractères min.)</span>}</label>
              <input id="cpass" className="input" type="password" required minLength={6} value={password}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button type="submit" className="btn primary big" disabled={busy}>
                {busy ? "…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>
              <button type="button" className="btn ghost" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(""); }}>
                {mode === "signup" ? "J'ai déjà un compte" : "Créer un compte"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
