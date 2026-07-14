"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { sauvegarderCloud, isAutoSave } from "@/lib/cloudsync";

/* Sauvegarde automatique périodique (si activée + connecté + en ligne). */
export default function CloudAutoSync() {
  useEffect(() => {
    let running = false;
    const tick = async () => {
      if (running || !isAutoSave() || !navigator.onLine) return;
      const sb = getSupabase();
      if (!sb) return;
      const { data } = await sb.auth.getSession();
      if (!data.session) return;
      running = true;
      try { await sauvegarderCloud(); } catch { /* silencieux */ } finally { running = false; }
    };
    const iv = setInterval(tick, 120000); // toutes les 2 minutes
    const onOnline = () => tick();
    window.addEventListener("online", onOnline);
    return () => { clearInterval(iv); window.removeEventListener("online", onOnline); };
  }, []);
  return null;
}
