"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  IcTree, IcDashboard, IcSite, IcMap, IcChart, IcClock, IcTruck,
  IcBox, IcEuro, IcUsers, IcBell, IcPlus, IcSun, IcMoon, IcWifiOff, IcSettings,
} from "@/lib/icons";

type Item = { href: string; label: string; icon: (p: object) => ReactNode; soon?: boolean };

const NAV: Item[] = [
  { href: "/", label: "Tableau de bord", icon: IcDashboard },
  { href: "/chantiers", label: "Chantiers", icon: IcSite },
  { href: "/carte", label: "Carte", icon: IcMap },
  { href: "/production", label: "Production", icon: IcChart },
  { href: "/temps", label: "Temps de travail", icon: IcClock },
  { href: "/engins", label: "Engins", icon: IcTruck },
  { href: "/materiel", label: "Matériel", icon: IcBox, soon: true },
  { href: "/compta", label: "Comptabilité", icon: IcEuro, soon: true },
  { href: "/clients", label: "Clients", icon: IcUsers, soon: true },
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

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();

  return (
    <div className="shell">
      {/* Barre latérale (ordinateur / tablette) */}
      <aside className="sidebar">
        <div className="brand">
          <IcTree />
          <span className="name">Syl<b>va</b></span>
        </div>

        <nav>
          {NAV.map((it) => {
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
          <div className="nav-item" style={{ justifyContent: "space-between" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <IcBell /> Alertes
            </span>
            <ThemeButton />
          </div>
          <div className="muted" style={{ fontSize: 12, padding: "8px 12px" }}>
            {online ? "En ligne · données locales" : "Hors-ligne · tout est sauvegardé"}
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
    </div>
  );
}
