"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  rafraichirSilencieux, surChangementJeton,
  connecter as connecterApi, inscrire as inscrireApi, deconnecter as deconnecterApi,
  type UtilisateurClient,
} from "@/lib/client/auth";

interface EtatAuth {
  utilisateur: UtilisateurClient | null;
  /** false tant que le rafraîchissement silencieux initial n'a pas répondu. */
  pret: boolean;
  connecter: (email: string, password: string) => Promise<void>;
  inscrire: (email: string, password: string, nom: string, role: "abatteur" | "debardeur") => Promise<void>;
  deconnecter: () => Promise<void>;
}

const Ctx = createContext<EtatAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<UtilisateurClient | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let vivant = true;
    rafraichirSilencieux().then((u) => { if (vivant) { setUtilisateur(u); setPret(true); } });
    return () => { vivant = false; };
  }, []);

  useEffect(() => surChangementJeton((t) => { if (!t) setUtilisateur(null); }), []);

  return (
    <Ctx.Provider value={{
      utilisateur, pret,
      connecter: async (e, p) => setUtilisateur(await connecterApi(e, p)),
      inscrire: async (e, p, n, r) => setUtilisateur(await inscrireApi(e, p, n, r)),
      deconnecter: async () => { await deconnecterApi(); setUtilisateur(null); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): EtatAuth {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth doit être appelé sous <AuthProvider>.");
  return c;
}
