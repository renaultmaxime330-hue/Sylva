"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useNotifs } from "@/lib/queries/notifs";
import { useMonEquipe } from "@/lib/queries/equipe";
import TourPorteurOverlay from "@/components/TourPorteurOverlay";
import {
  IcTree, IcDashboard, IcSite, IcMap, IcChart, IcClock, IcTruck,
  IcBox, IcEuro, IcUsers, IcBell, IcPlus, IcSun, IcMoon, IcWifiOff, IcSettings, IcReport, IcReceipt,
} from "@/lib/icons";

type Item = { href: string; label: string; icon: (p: object) => ReactNode; soon?: boolean; chefRequis?: boolean };

const NAV: Item[] = [
  { href: "/", label: "Tableau de bord", icon: IcDashboard },
  { href: "/chantiers", label: "Chantiers", icon: IcSite },
  { href: "/carte", label: "Carte", icon: IcMap },
  { href: "/production", label: "Production", icon: IcChart },
  { href: "/temps", label: "Temps de travail", icon: IcClock },
  { href: "/engins", label: "Engins", icon: IcTruck },
  { href: "/materiel", label: "Matériel", icon: IcBox },
  { href: "/compta", label: "Comptabilité", icon: IcEuro, chefRequis: true },
  { href: "/factures", label: "Devis & Factures", icon: IcReceipt, chefRequis: true },
  { href: "/rapports", label: "Rapports", icon: IcReport },
  { href: "/clients", label: "Clients", icon: IcUsers },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState("system");
  useEffect(() => {
    setTheme(localStorage.getItem("sylva-theme") || "system");
  }, []);
  const toggle = () => {
    const isDark =
      document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sylva-theme", next);
    setTheme(next);
  };
  return [theme, toggle];
}

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener("online", up);
    window.addEventListener("offline", up);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", up);
    };
  }, []);
  return online;
}

function ThemeButton() {
  const [, toggle] = useTheme();
  return (
    <button className="iconbtn" onClick={toggle} aria-label="Changer de thème" title="Clair / sombre">
      <span className="only-light"><IcMoon /></span>
      <span className="only-dark"><IcSun /></span>
    </button>
  );
}

/* La page de connexion doit être la seule chose visible tant qu'on n'est pas
   authentifié — pas la coquille applicative (sidebar/nav) autour, qui
   donnerait l'impression d'un accès déjà acquis avant de s'être connecté. */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/connexion") return <>{children}</>;
  return <ShellAuthentifie>{children}</ShellAuthentifie>;
}

function ShellAuthentifie({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const { data: notifs } = useNotifs();
  const nonLues = notifs?.filter((n) => !n.lu).length ?? 0;
  const { data: equipe } = useMonEquipe();
  const estChef = equipe?.monChefEntreprise ?? false;
  const navVisible = NAV.filter((it) => !it.chefRequis || estChef);

  return (
    <div className="shell">
      {/* Barre latérale (ordinateur / tablette) */}
      <aside className="sidebar">
        <div className="brand">
          <IcTree />
          <span className="name">Syl<b>va</b></span>
        </div>

        <nav>
          {navVisible.map((it) => {
            const Icon = it.icon;
            if (it.soon) {
              return (
                <div key={it.href} className="nav-item soon" aria-disabled="true">
                  <Icon /> <span>{it.label}</span> <span className="tag">Bientôt</span>
                </div>
              );
            }
            return (
              <Link
                key={it.href}
                href={it.href}
                className={"nav-item" + (isActive(pathname, it.href) ? " active" : "")}
                aria-current={isActive(pathname, it.href) ? "page" : undefined}
              >
                <Icon /> <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <Link href="/reglages" className={"nav-item" + (isActive(pathname, "/reglages") ? " active" : "")}>
            <IcSettings /> <span>Réglages</span>
          </Link>
          <div className="nav-item-row">
            <Link href="/alertes" className={"nav-item" + (isActive(pathname, "/alertes") ? " active" : "")} style={{ flex: 1 }}>
              <IcBell /> <span>Alertes</span>
              {nonLues > 0 && <span className="badge-nb">{nonLues > 99 ? "99+" : nonLues}</span>}
            </Link>
            <ThemeButton />
          </div>
          <div className="muted" style={{ fontSize: 12, padding: "8px 12px" }}>
            {online ? "En ligne" : "Hors-ligne — connexion nécessaire"}
          </div>
        </div>
      </aside>

      {/* Zone principale */}
      <div className="main">
        {/* Barre du haut (mobile) */}
        <header className="topbar">
          <div className="brand" style={{ padding: 0, flex: 1 }}>
            <IcTree />
            <span className="name">Syl<b>va</b></span>
          </div>
          {!online && (
            <span className="pill sm doing" title="Mode hors-ligne">
              <IcWifiOff /> Hors-ligne
            </span>
          )}
          <Link href="/alertes" className="iconbtn cloche" aria-label={`Alertes${nonLues > 0 ? ` (${nonLues} non lues)` : ""}`}>
            <IcBell />
            {nonLues > 0 && <span className="badge-pt">{nonLues > 9 ? "9+" : nonLues}</span>}
          </Link>
          <ThemeButton />
        </header>

        <main className="content fade-in">{children}</main>
      </div>

      {/* Barre d'onglets (mobile) */}
      <nav className="tabbar">
        <Link href="/" className={isActive(pathname, "/") ? "active" : ""}>
          <IcDashboard /> Accueil
        </Link>
        <Link href="/chantiers" className={isActive(pathname, "/chantiers") && pathname !== "/chantiers/nouveau" ? "active" : ""}>
          <IcSite /> Chantiers
        </Link>
        <Link href="/carte" className={isActive(pathname, "/carte") ? "active" : ""}>
          <IcMap /> Carte
        </Link>
        <Link href="/chantiers/nouveau" className={pathname === "/chantiers/nouveau" ? "active" : ""}>
          <IcPlus /> Nouveau
        </Link>
      </nav>

      <TourPorteurOverlay />
    </div>
  );
}
