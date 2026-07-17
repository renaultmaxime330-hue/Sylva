import type { Metadata, Viewport } from "next";
import { Manrope, Fraunces } from "next/font/google";
import "./globals.css";
import "./ui.css";
import "leaflet/dist/leaflet.css";
import AppShell from "@/components/AppShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import CloudAutoSync from "@/components/CloudAutoSync";
import EcouteurEquipe from "@/components/EcouteurEquipe";
import { AuthProvider } from "@/components/AuthProvider";
import QueryProvider from "@/components/QueryProvider";

/* Polices auto-hébergées par Next (aucune requête externe à l'usage → OK hors-ligne) :
   Manrope pour l'interface, Fraunces (serif organique) pour les grands titres. */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-disp", display: "swap", axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Sylva — Gestion de chantiers forestiers",
  description:
    "L'outil de gestion de chantiers pour l'abattage forestier : chantiers, cartes, production. Utilisable hors-ligne.",
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${manrope.variable} ${fraunces.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ServiceWorkerRegister />
        <CloudAutoSync />
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
