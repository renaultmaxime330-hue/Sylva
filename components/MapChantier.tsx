"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type * as Leaflet from "leaflet";
import {
  GEOM_TYPES, geomTypeInfo,
  type Chantier, type Geometrie, type GeomType, type GeoJSONGeometry,
} from "@/lib/db";
import {
  ajouterGeometrie, supprimerGeometrie, renommerGeometrie, surfaceHa, longueurM,
} from "@/lib/geometries";
import { useGeometries } from "@/lib/queries/geometries";
import { modifierChantier, obtenirPosition } from "@/lib/chantiers";
import { formatLongueur } from "@/lib/format";
import { roleLabel, type Role } from "@/lib/profil";
import { depuis, type Coequipier, type MoiPresence } from "@/lib/presence";
import { emettre } from "@/lib/client/socket";
import {
  toGeoJSON, toGPX, toKML, downloadText, nomFichier, parseGeoJSONGeometries,
} from "@/lib/export";
import type { ReactNode } from "react";
import {
  IcPin, IcTrash, IcCheck, IcRuler, IcDoc, IcBack, IcEdit,
  IcWarning, IcRoute, IcTruck, IcLogs, IcUsers,
} from "@/lib/icons";

type LApi = typeof Leaflet;

const fmtHa = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) + " ha";

/* Icône (React) par type, pour les boutons d'outils. */
const TOOL_ICON: Record<GeomType, (p: object) => ReactNode> = {
  parcelle: IcEdit,
  zone_danger: IcWarning,
  place_depot: IcLogs,
  point: IcPin,
  piste: IcTruck,
  chemin: IcRoute,
};

/* Glyphe SVG (blanc) par type, pour les pastilles sur la carte. */
function glyphFor(type: GeomType): string {
  switch (type) {
    case "place_depot":
      return '<circle cx="7.6" cy="15" r="3.7"/><circle cx="16.4" cy="15" r="3.7"/><circle cx="12" cy="7.8" r="3.7"/>';
    case "point":
      return '<path d="M12 21s6.3-5.6 6.3-10.3a6.3 6.3 0 0 0-12.6 0C5.7 15.4 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.2"/>';
    case "piste":
      return '<path d="M3 16V9a1.4 1.4 0 0 1 1.4-1.4h8L16.5 11H20a1.4 1.4 0 0 1 1.4 1.4V16"/><circle cx="7.5" cy="16.6" r="1.7"/><circle cx="16.5" cy="16.6" r="1.7"/>';
    case "chemin":
      return '<circle cx="6" cy="18.5" r="1.7"/><circle cx="18" cy="5.5" r="1.7"/><path d="M7.6 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6H16"/>';
    case "zone_danger":
      return '<path d="M12 4 3 19h18L12 4Z"/><line x1="12" y1="10" x2="12" y2="14.5"/><line x1="12" y1="17.3" x2="12.01" y2="17.3"/>';
    default:
      return '<path d="M12 21s6.3-5.6 6.3-10.3a6.3 6.3 0 0 0-12.6 0C5.7 15.4 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.2"/>';
  }
}

function makeBadge(L: LApi, type: GeomType, couleur: string): Leaflet.DivIcon {
  const svg = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyphFor(type)}</svg>`;
  return L.divIcon({
    className: "geo-badge-wrap",
    html: `<span class="geo-badge" style="background:${couleur}">${svg}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    tooltipAnchor: [0, -14],
  });
}

/* ---------- Coéquipiers en direct ---------- */
const COULEUR_ROLE: Record<Role, string> = { abatteur: "#C0392B", debardeur: "#2E6B41" };

function roleGlyph(r: Role): string {
  return r === "debardeur"
    // porteur / débardeuse
    ? '<path d="M3 16V9a1.4 1.4 0 0 1 1.4-1.4h8L16.5 11H20a1.4 1.4 0 0 1 1.4 1.4V16"/><circle cx="7.5" cy="16.6" r="1.7"/><circle cx="16.5" cy="16.6" r="1.7"/>'
    // résineux
    : '<path d="M12 2.8 6.2 11h3.2l-3.9 5.4h13L14.6 11h3.2L12 2.8Z"/><line x1="12" y1="16.4" x2="12" y2="21.2"/>';
}

function makeLiveBadge(L: LApi, role: Role, couleur: string): Leaflet.DivIcon {
  const svg = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${roleGlyph(role)}</svg>`;
  return L.divIcon({
    className: "geo-badge-wrap",
    html: `<span class="live-badge" style="background:${couleur}"><span class="live-ring" style="border-color:${couleur}"></span>${svg}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    tooltipAnchor: [0, -17],
  });
}

/* ---------- Fonds de carte (IGN Géoplateforme + OSM) ---------- */
const ignWmts = (layer: string, format = "image/png") =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}` +
  `&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;

const BASES = [
  { id: "plan", label: "Plan IGN" },
  { id: "sat", label: "Satellite" },
  { id: "osm", label: "OSM" },
] as const;
type BaseId = (typeof BASES)[number]["id"];

const toLatLng = (p: [number, number]): [number, number] => [p[1], p[0]];

export default function MapChantier({
  chantier, readOnly = false, editHref, equipiers, moi, monRole, monNom,
}: {
  chantier: Chantier;
  readOnly?: boolean;
  editHref?: string;
  /** Membres de l'équipe à afficher en direct (position partagée). */
  equipiers?: Coequipier[];
  /** Ma propre position en direct (jamais incluse dans equipiers). */
  moi?: MoiPresence;
  monRole?: Role;
  monNom?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<LApi | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const baseRef = useRef<Record<BaseId, Leaflet.TileLayer> | null>(null);
  const cadastreRef = useRef<Leaflet.TileLayer | null>(null);
  const geomsLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const draftLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const equipeLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const posMarkerRef = useRef<Leaflet.CircleMarker | null>(null);
  const [ready, setReady] = useState(false);

  const [base, setBase] = useState<BaseId>("plan");
  const [cadastre, setCadastre] = useState(false);
  const [traceFiltre, setTraceFiltre] = useState<"aucun" | "abatteur" | "debardeur" | "tous">("aucun");

  // Dessin
  const drawTypeRef = useRef<GeomType | null>(null);
  const pointsRef = useRef<[number, number][]>([]);
  const [drawType, setDrawType] = useState<GeomType | null>(null);
  const [draftArea, setDraftArea] = useState<number | undefined>(undefined);
  const [nbPoints, setNbPoints] = useState(0);
  const [msg, setMsg] = useState<string>("");
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toast(t: string) {
    setMsg(t);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(""), 4000);
  }

  /** Signale une modif de carte à l'équipe en temps réel. L'identité (auteur,
      rôle) est ajoutée côté serveur d'après le jeton du socket — jamais par
      le client, pour ne jamais pouvoir être usurpée. */
  function annoncer(action: "ajout" | "suppression" | "renommage", typeGeom: GeomType, nomGeom: string) {
    emettre("carte:evenement", { action, typeGeom, nomGeom, chantierId: chantier.id, chantierNom: chantier.nom });
  }

  const fileRef = useRef<HTMLInputElement>(null);

  const { data: geometries } = useGeometries(chantier.id);

  /* ---- Initialisation ---- */
  useEffect(() => {
    let disposed = false;
    (async () => {
      const mod = await import("leaflet");
      if (disposed || !containerRef.current) return;
      const L = ((mod as unknown as { default?: LApi }).default ?? (mod as unknown as LApi));
      LRef.current = L;

      const hasPos = chantier.lat != null && chantier.lng != null;
      const map = L.map(containerRef.current, {
        center: hasPos ? [chantier.lat!, chantier.lng!] : [44.2, -0.77],
        zoom: hasPos ? 14 : 7,
        zoomControl: true,
      });
      mapRef.current = map;

      const mk = (layer: string, fmt?: string) =>
        L.tileLayer(ignWmts(layer, fmt), { tileSize: 256, maxZoom: 19, attribution: "© IGN-F / Géoplateforme" });
      baseRef.current = {
        plan: mk("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"),
        sat: mk("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg"),
        osm: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }),
      };
      baseRef.current.plan.addTo(map);
      cadastreRef.current = L.tileLayer(ignWmts("CADASTRALPARCELS.PARCELLAIRE_EXPRESS"), { tileSize: 256, maxZoom: 19, opacity: 0.8 });

      draftLayerRef.current = L.layerGroup().addTo(map);

      if (hasPos) {
        L.circleMarker([chantier.lat!, chantier.lng!], { radius: 8, color: "#fff", weight: 2, fillColor: "#2E6B41", fillOpacity: 1 })
          .addTo(map).bindTooltip(chantier.nom);
      }

      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        const dt = drawTypeRef.current;
        if (!dt) return;
        const info = geomTypeInfo(dt);
        const p: [number, number] = [e.latlng.lng, e.latlng.lat];
        if (info.geom === "Point") {
          let nom: string | undefined;
          if (dt === "point") {
            const d = prompt("Décris ce point d'intérêt :\n(ex. souche dangereuse, source, accès difficile, gros chêne à garder…)");
            if (d === null) { stopDraw(); return; } // annulé
            nom = d.trim() || undefined;
          }
          void ajouterGeometrie(chantier.id, dt, { type: "Point", coordinates: p }, nom);
          annoncer("ajout", dt, nom ?? "");
          void finishPoint(dt);
          return;
        }
        // Fermer le polygone si on reclique sur le premier sommet
        const pts = pointsRef.current;
        if (info.geom === "Polygon" && pts.length >= 3) {
          const first = map.latLngToContainerPoint([pts[0][1], pts[0][0]]);
          const here = map.latLngToContainerPoint(e.latlng);
          if (first.distanceTo(here) < 20) {
            void finishDraw();
            return;
          }
        }
        pointsRef.current = [...pts, p];
        refreshDraft();
      });

      setTimeout(() => map.invalidateSize(), 60);
      setReady(true);
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      LRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantier.id]);

  /* ---- Rendu des géométries enregistrées ---- */
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!ready || !L || !map || !geometries) return;
    geomsLayerRef.current?.remove();

    const group = L.layerGroup();
    const fc = {
      type: "FeatureCollection",
      features: geometries.map((g) => ({
        type: "Feature",
        properties: { id: g.id, type: g.type, couleur: g.couleur, nom: g.nom, surfaceHa: g.surfaceHa ?? null, longueurM: g.longueurM ?? null },
        geometry: g.geojson,
      })),
    } as unknown as Parameters<LApi["geoJSON"]>[0];

    const gj = L.geoJSON(fc, {
      style: (f) => {
        const t = (f?.properties?.type ?? "parcelle") as GeomType;
        const c = (f?.properties?.couleur ?? "#2E6B41") as string;
        if (f?.geometry?.type === "LineString") {
          return {
            color: c, weight: 6, opacity: 0.95,
            dashArray: t === "chemin" ? "2,12" : undefined,
            lineCap: "round" as const, lineJoin: "round" as const,
          };
        }
        return {
          color: c, weight: 3.5, opacity: 1, fillColor: c,
          fillOpacity: t === "zone_danger" ? 0.32 : 0.18,
          dashArray: t === "zone_danger" ? "7,6" : undefined, lineJoin: "round" as const,
        };
      },
      pointToLayer: (f, latlng) =>
        L.marker(latlng, {
          icon: makeBadge(L, (f.properties?.type ?? "point") as GeomType, (f.properties?.couleur ?? "#2563EB") as string),
        }),
      onEachFeature: (f, lyr) => {
        const t = (f.properties?.type ?? "parcelle") as GeomType;
        const nom = f.properties?.nom as string | undefined;
        const couleur = (f.properties?.couleur ?? "#2E6B41") as string;

        if (f.geometry.type === "Polygon") {
          const label = t === "parcelle" && f.properties?.surfaceHa != null
            ? fmtHa(f.properties.surfaceHa as number)
            : (nom || geomTypeInfo(t).label);
          lyr.bindTooltip(label, { permanent: true, direction: "center", className: "area-label" });
          if (t === "zone_danger") {
            const center = (lyr as Leaflet.Polygon).getBounds().getCenter();
            L.marker(center, { icon: makeBadge(L, "zone_danger", couleur), interactive: false }).addTo(group);
          }
        } else if (f.geometry.type === "LineString") {
          const coords = (f.geometry as GeoJSON.LineString).coordinates;
          const len = (f.properties?.longueurM as number | undefined)
            ?? longueurM(f.geometry as unknown as GeoJSONGeometry);
          const label = nom || geomTypeInfo(t).label;
          const makePopup = () => {
            const d = document.createElement("div");
            d.className = "poi-popup";
            const t1 = document.createElement("div");
            t1.style.fontWeight = "700";
            t1.textContent = label;
            const t2 = document.createElement("div");
            t2.className = "popup-len";
            t2.textContent = "Longueur : " + formatLongueur(len);
            d.append(t1, t2);
            return d;
          };
          lyr.bindPopup(makePopup, { className: "poi-popup-wrap" });
          const mid = coords[Math.floor(coords.length / 2)] as [number, number] | undefined;
          if (mid) {
            L.marker([mid[1], mid[0]], { icon: makeBadge(L, t, couleur) })
              .addTo(group)
              .bindPopup(makePopup, { className: "poi-popup-wrap" })
              .bindTooltip(label);
          }
        } else if (f.geometry.type === "Point") {
          if (nom) {
            const div = document.createElement("div");
            div.className = "poi-popup";
            div.textContent = nom;
            lyr.bindPopup(div, { closeButton: true, className: "poi-popup-wrap" });
          }
        }
      },
    });
    gj.addTo(group);
    group.addTo(map);
    geomsLayerRef.current = group;
  }, [ready, geometries]);

  /* ---- Coéquipiers en direct (+ moi, jamais inclus dans equipiers) ---- */
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!ready || !L || !map) return;
    equipeLayerRef.current?.remove();
    equipeLayerRef.current = null;

    type Localise = { userId: string; nom: string; role: Role; lat: number; lng: number; precisionM: number | null; maj: string; trace: [number, number][] };
    const personnes: Localise[] = [];
    if (moi && monRole && moi.lat != null && moi.lng != null) {
      personnes.push({ userId: "moi", nom: monNom ?? "Moi", role: monRole, lat: moi.lat, lng: moi.lng, precisionM: moi.precisionM, maj: moi.maj, trace: moi.trace });
    }
    for (const e of equipiers ?? []) {
      if (e.lat == null || e.lng == null) continue;
      personnes.push({ userId: e.userId, nom: e.nom, role: e.role, lat: e.lat, lng: e.lng, precisionM: e.precisionM, maj: e.maj, trace: e.trace });
    }
    if (personnes.length === 0) return;

    const group = L.layerGroup();
    for (const p of personnes) {
      const couleur = COULEUR_ROLE[p.role] ?? "#2563EB";
      if (traceFiltre !== "aucun" && (traceFiltre === "tous" || traceFiltre === p.role) && p.trace.length >= 2) {
        L.polyline(p.trace, { color: couleur, weight: 4, opacity: 0.65, lineCap: "round", lineJoin: "round", interactive: false }).addTo(group);
      }
      // Cercle de précision quand le GPS est approximatif
      if (p.precisionM != null && p.precisionM > 25) {
        L.circle([p.lat, p.lng], {
          radius: p.precisionM, color: couleur, weight: 1, opacity: 0.5,
          fillColor: couleur, fillOpacity: 0.08, interactive: false,
        }).addTo(group);
      }
      const label = p.userId === "moi" ? `${p.nom} (toi) — ${roleLabel(p.role)}` : `${p.nom} — ${roleLabel(p.role)}`;
      L.marker([p.lat, p.lng], { icon: makeLiveBadge(L, p.role, couleur), zIndexOffset: 1000 })
        .addTo(group)
        .bindTooltip(`${label}<br><span class="ll-sub">${depuis(p.maj)}</span>`, {
          permanent: true, direction: "top", offset: [0, -6], className: "live-label",
        });
    }
    group.addTo(map);
    equipeLayerRef.current = group;
  }, [ready, equipiers, moi, monRole, monNom, traceFiltre]);

  /* ---- Fond de carte ---- */
  useEffect(() => {
    const map = mapRef.current, b = baseRef.current;
    if (!ready || !map || !b) return;
    (["plan", "sat", "osm"] as BaseId[]).forEach((k) => { if (map.hasLayer(b[k])) map.removeLayer(b[k]); });
    b[base].addTo(map);
    b[base].bringToBack();
  }, [ready, base]);

  useEffect(() => {
    const map = mapRef.current, c = cadastreRef.current;
    if (!ready || !map || !c) return;
    if (cadastre) c.addTo(map);
    else if (map.hasLayer(c)) map.removeLayer(c);
  }, [ready, cadastre]);

  /* ---- Dessin ---- */
  function refreshDraft() {
    const L = LRef.current, grp = draftLayerRef.current;
    if (!L || !grp) return;
    grp.clearLayers();
    const pts = pointsRef.current;
    const dt = drawTypeRef.current;
    const isPoly = dt ? geomTypeInfo(dt).geom === "Polygon" : false;
    const col = dt ? geomTypeInfo(dt).couleur : "#2E6B41";
    const fillOp = dt === "zone_danger" ? 0.28 : 0.18;
    const latlngs = pts.map(toLatLng);
    if (pts.length >= 2) L.polyline(latlngs, { color: col, weight: 3.5, dashArray: "6,5", lineCap: "round", interactive: false }).addTo(grp);
    if (isPoly && pts.length >= 3) {
      L.polygon(latlngs, { color: col, weight: 2.5, fillColor: col, fillOpacity: fillOp, interactive: false }).addTo(grp);
      setDraftArea(surfaceHa({ type: "Polygon", coordinates: [[...pts, pts[0]]] }));
    } else {
      setDraftArea(undefined);
    }
    latlngs.forEach((ll, i) => {
      const closeTarget = isPoly && pts.length >= 3 && i === 0;
      L.circleMarker(ll, closeTarget
        ? { radius: 10, color: col, weight: 3, fillColor: "#fff", fillOpacity: 1, interactive: false }
        : { radius: 5, color: "#fff", weight: 2, fillColor: col, fillOpacity: 1, interactive: false }
      ).addTo(grp);
    });
    setNbPoints(pts.length);
  }

  function startDraw(t: GeomType) {
    drawTypeRef.current = t;
    pointsRef.current = [];
    setDrawType(t);
    setDraftArea(undefined);
    setNbPoints(0);
    draftLayerRef.current?.clearLayers();
    if (mapRef.current) mapRef.current.getContainer().style.cursor = "crosshair";
  }

  function stopDraw() {
    drawTypeRef.current = null;
    pointsRef.current = [];
    setDrawType(null);
    setDraftArea(undefined);
    setNbPoints(0);
    draftLayerRef.current?.clearLayers();
    if (mapRef.current) mapRef.current.getContainer().style.cursor = "";
  }

  async function finishPoint(dt: GeomType) {
    stopDraw();
    toast(`${geomTypeInfo(dt).label} placé.`);
  }

  async function finishDraw() {
    const dt = drawTypeRef.current, pts = pointsRef.current;
    if (!dt) return;
    const info = geomTypeInfo(dt);
    let geojson: GeoJSONGeometry | null = null;
    if (info.geom === "Polygon" && pts.length >= 3) geojson = { type: "Polygon", coordinates: [[...pts, pts[0]]] };
    else if (info.geom === "LineString" && pts.length >= 2) geojson = { type: "LineString", coordinates: pts };
    if (!geojson) return;
    await ajouterGeometrie(chantier.id, dt, geojson);
    annoncer("ajout", dt, "");
    // Pour une parcelle : calcule et applique directement la surface au chantier
    if (dt === "parcelle") {
      const ha = surfaceHa(geojson);
      if (ha != null) {
        await modifierChantier(chantier.id, { surfaceHa: ha });
        toast(`Parcelle enregistrée — ${fmtHa(ha)}. Surface du chantier mise à jour ✓`);
      } else {
        toast("Parcelle enregistrée.");
      }
    } else {
      toast(`${info.label} enregistré${info.geom === "LineString" ? "e" : ""}.`);
    }
    stopDraw();
  }

  function undoPoint() {
    pointsRef.current = pointsRef.current.slice(0, -1);
    refreshDraft();
  }

  async function definirSurface(g: Geometrie) {
    if (g.surfaceHa == null) return;
    await modifierChantier(chantier.id, { surfaceHa: g.surfaceHa });
  }

  function centrer(g: Geometrie) {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    const coords = collectCoords(g.geojson);
    if (coords.length === 0) return;
    if (coords.length === 1) { map.setView([coords[0][1], coords[0][0]], 15); return; }
    map.fitBounds(L.latLngBounds(coords.map(toLatLng)), { padding: [40, 40], maxZoom: 16 });
  }

  function centrerToutes() {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    const gs = geometries ?? [];
    if (gs.length === 0) {
      if (chantier.lat != null && chantier.lng != null) map.setView([chantier.lat, chantier.lng], 14);
      return;
    }
    const all = gs.flatMap((g) => collectCoords(g.geojson));
    if (all.length) map.fitBounds(L.latLngBounds(all.map(toLatLng)), { padding: [40, 40], maxZoom: 16 });
  }

  async function maPosition() {
    try {
      const { lat, lng } = await obtenirPosition();
      const L = LRef.current, map = mapRef.current;
      if (!L || !map) return;
      map.setView([lat, lng], 15);
      posMarkerRef.current?.remove();
      posMarkerRef.current = L.circleMarker([lat, lng], { radius: 7, color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }).addTo(map);
    } catch (e) {
      alert("Position indisponible : " + (e instanceof Error ? e.message : ""));
    }
  }

  function centrerEquipe() {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    const pts = (equipiers ?? [])
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => [e.lat!, e.lng!] as [number, number]);
    if (moi?.lat != null && moi.lng != null) pts.push([moi.lat, moi.lng]);
    if (pts.length === 0) return;
    if (pts.length === 1) map.setView(pts[0], 15);
    else map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
  }

  function exporter(fmt: "geojson" | "gpx" | "kml") {
    const gs = geometries ?? [];
    if (fmt === "geojson") downloadText(nomFichier(chantier, "geojson"), toGeoJSON(chantier, gs), "application/geo+json");
    if (fmt === "gpx") downloadText(nomFichier(chantier, "gpx"), toGPX(chantier, gs), "application/gpx+xml");
    if (fmt === "kml") downloadText(nomFichier(chantier, "kml"), toKML(chantier, gs), "application/vnd.google-earth.kml+xml");
  }

  async function importer(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    try {
      const parsed = parseGeoJSONGeometries(await file.text());
      for (const g of parsed) {
        const t: GeomType = g.type === "Point" ? "point" : g.type === "LineString" ? "piste" : "parcelle";
        await ajouterGeometrie(chantier.id, t, g, "Importé");
      }
      if (parsed.length === 0) alert("Aucune géométrie trouvée dans ce fichier GeoJSON.");
      else setTimeout(centrerToutes, 300);
    } catch {
      alert("Fichier illisible. Formats acceptés : GeoJSON (.geojson / .json).");
    }
  }

  const drawInfo = drawType ? geomTypeInfo(drawType) : null;
  const geoms = geometries ?? [];
  const equipeLocalisee = (equipiers ?? []).filter((e) => e.lat != null && e.lng != null);

  return (
    <div className="stack-gap">
      <div className="map-toolbar">
        <div className="seg-mini">
          {BASES.map((b) => (
            <button key={b.id} data-on={base === b.id} onClick={() => setBase(b.id)}>{b.label}</button>
          ))}
        </div>
        <button className="chip-btn" data-on={cadastre} onClick={() => setCadastre((v) => !v)}>Cadastre</button>
        <button className="chip-btn" onClick={maPosition}><IcPin /> Ma position</button>
        <button className="chip-btn" onClick={centrerToutes}>Recentrer</button>
        {equipeLocalisee.length > 0 && (
          <button className="chip-btn" onClick={centrerEquipe}>
            <IcUsers /> Voir mon équipe ({equipeLocalisee.length})
          </button>
        )}
        {equipiers !== undefined && (
          <div className="seg-mini" title="Afficher le tracé GPS parcouru">
            <button data-on={traceFiltre === "aucun"} onClick={() => setTraceFiltre("aucun")}><IcRoute /> Tracé</button>
            <button data-on={traceFiltre === "abatteur"} onClick={() => setTraceFiltre("abatteur")}>Abatteur</button>
            <button data-on={traceFiltre === "debardeur"} onClick={() => setTraceFiltre("debardeur")}>Débardeur</button>
            <button data-on={traceFiltre === "tous"} onClick={() => setTraceFiltre("tous")}>Les deux</button>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div className="export-group">
          {!readOnly && (
            <>
              <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json" style={{ display: "none" }} onChange={importer} />
              <button className="chip-btn" onClick={() => fileRef.current?.click()}>Importer</button>
            </>
          )}
          <button className="chip-btn" onClick={() => exporter("geojson")}>GeoJSON</button>
          <button className="chip-btn" onClick={() => exporter("gpx")}>GPX</button>
          <button className="chip-btn" onClick={() => exporter("kml")}>KML</button>
        </div>
      </div>

      {drawType && drawInfo && (
        <div className="draw-status">
          <div className="ds-info">
            <span className="pill sm" style={{ color: drawInfo.couleur, background: "var(--surface-2)" }}>{drawInfo.label}</span>
            {drawInfo.geom === "Polygon" && (
              <span className="ds-area">{draftArea != null ? fmtHa(draftArea) : "— ha"}</span>
            )}
            <span className="ds-hint muted">
              {drawInfo.geom === "Polygon"
                ? (nbPoints < 3
                    ? `Touche la carte pour poser les coins de la parcelle (${nbPoints}/3 minimum).`
                    : "Reclique sur le 1er point (blanc) pour fermer, ou « Terminer ».")
                : drawInfo.geom === "LineString"
                ? `Touche la carte pour tracer le chemin (${nbPoints} point${nbPoints > 1 ? "s" : ""}).`
                : "Touche la carte à l'endroit voulu."}
            </span>
          </div>
          <div className="ds-btns">
            {drawInfo.geom !== "Point" && (
              <>
                <button className="btn primary" onClick={finishDraw}
                  disabled={drawInfo.geom === "Polygon" ? nbPoints < 3 : nbPoints < 2}>
                  <IcCheck /> Terminer
                </button>
                <button className="btn" onClick={undoPoint} disabled={nbPoints === 0}><IcBack /> Annuler</button>
              </>
            )}
            <button className="btn ghost" onClick={stopDraw}>Quitter</button>
          </div>
        </div>
      )}

      <div className="map-wrap">
        <div ref={containerRef} className="map-canvas" />
      </div>

      {msg && <div className="banner fade-in"><IcCheck /> {msg}</div>}

      {readOnly && (
        <div className="ro-edit">
          <span className="muted">
            {geoms.length > 0
              ? `${geoms.length} tracé${geoms.length > 1 ? "s" : ""} sur ce chantier. Les modifications se font dans l'outil Carte.`
              : "Aucun tracé pour l'instant."}
          </span>
          {editHref && (
            <Link href={editHref} className="btn primary big"><IcEdit /> Modifier sur la carte</Link>
          )}
        </div>
      )}

      {!readOnly && !drawType && (
        <div className="draw-actions">
          <button className="btn primary big draw-primary" onClick={() => startDraw("parcelle")}>
            <IcEdit /> Dessiner la parcelle
          </button>
          <div className="tool-row">
            <span className="tool-row-label muted">Ajouter :</span>
            {GEOM_TYPES.filter((t) => t.value !== "parcelle").map((t) => {
              const Icon = TOOL_ICON[t.value];
              return (
                <button key={t.value} className="tool-btn" onClick={() => startDraw(t.value)}>
                  <span className="tool-ic" style={{ color: t.couleur }}><Icon /></span> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {geoms.length > 0 ? (
        <div className="list">
          {geoms.map((g) => {
            const info = geomTypeInfo(g.type);
            return (
              <div className="geo-row" key={g.id}>
                <span className="gdot" style={{ background: g.couleur }} />
                <div className="gbody" onClick={() => centrer(g)} role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && centrer(g)}>
                  <div className="t">{g.nom}</div>
                  <div className="m muted">
                    {info.label}
                    {g.surfaceHa != null && ` · ${g.surfaceHa.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ha`}
                    {g.longueurM != null && ` · ${formatLongueur(g.longueurM)}`}
                  </div>
                </div>
                {!readOnly && g.type === "parcelle" && g.surfaceHa != null && (
                  <button className="btn ghost" title="Utiliser comme surface du chantier" onClick={() => definirSurface(g)}>
                    <IcRuler /> Définir surface
                  </button>
                )}
                {!readOnly && (
                  <>
                    <button className="iconbtn" aria-label="Renommer"
                      onClick={() => {
                        const n = prompt("Nom :", g.nom);
                        if (n != null) { renommerGeometrie(g.id, n, chantier.id); annoncer("renommage", g.type, n); }
                      }}>
                      <IcDoc />
                    </button>
                    <button className="iconbtn" aria-label="Supprimer"
                      onClick={() => {
                        if (confirm("Supprimer cet élément ?")) { supprimerGeometrie(g.id, chantier.id); annoncer("suppression", g.type, g.nom); }
                      }}>
                      <IcTrash />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (!readOnly && (
        <p className="muted" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <IcPin /> Aucun tracé. Choisis un outil ci-dessus pour dessiner la parcelle, poser un point de dépôt, une zone dangereuse…
        </p>
      ))}
    </div>
  );
}

/* Tous les points [lng,lat] d'une géométrie. */
function collectCoords(g: GeoJSONGeometry): [number, number][] {
  if (g.type === "Point") return [g.coordinates];
  if (g.type === "LineString") return g.coordinates;
  return g.coordinates[0];
}
