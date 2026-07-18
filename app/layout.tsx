import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";
import "./ui.css";
import "leaflet/dist/leaflet.css";
import AppShell from "@/components/AppShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import EcouteurEquipe from "@/components/EcouteurEquipe";
import { AuthProvider } from "@/components/AuthProvider";
import QueryProvider from "@/components/QueryProvider";

/* Polices auto-hébergées par Next (aucune requête externe à l'usage). */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-disp", display: "swap", axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Sylva — Gestion de chantiers forestiers",
  description:
    "L'outil de gestion de chantiers pour l'abattage forestier : chantiers, cartes, production, temps réel avec ton équipe.",
  applicationName: "Sylva",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Sylva" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2E6B41",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applique le thème enregistré avant le premier rendu (évite le scintillement).
const themeScript = `(function(){try{var t=localStorage.getItem('sylva-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fr" suppressHydrationWarning className={`${manrope.variable} ${fraunces.variable}`}>
      <body>
        {/* ⚠️ Avertissement d'hydratation React attendu et sans gravité sur cette
            balise (visible en dev uniquement) : les navigateurs cachent
            volontairement l'attribut nonce du DOM après coup (sécurité,
            empêche son exfiltration par script), donc React le voit "vide"
            côté client alors qu'il était correct côté serveur — le script
            s'est déjà exécuté avec la bonne valeur avant même l'hydratation.
            `suppressHydrationWarning` ne couvre que le texte, pas les
            attributs, donc ne supprime pas ce message précis ; vérifié
            qu'aucune violation CSP n'est levée (le nonce est bien accepté). */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ServiceWorkerRegister />
        <EcouteurEquipe />
        <AuthProvider>
          <QueryProvider>
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
