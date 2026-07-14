import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ui.css";
import "leaflet/dist/leaflet.css";
import AppShell from "@/components/AppShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import CloudAutoSync from "@/components/CloudAutoSync";

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
    <html lang="fr" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ServiceWorkerRegister />
        <CloudAutoSync />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
