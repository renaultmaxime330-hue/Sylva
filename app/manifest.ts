import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sylva — Gestion de chantiers forestiers",
    short_name: "Sylva",
    description: "Gestion de chantiers pour l'abattage forestier, en équipe et en temps réel.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F5F0",
    theme_color: "#2E6B41",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
