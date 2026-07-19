import type { SVGProps } from "react";

/* Jeu d'icônes maison — trait 1.8, style « outline » professionnel. */

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IcTree = (p: P) => (
  <svg {...base(p)}><path d="M12 2 6 11h4l-4 7h12l-4-7h4L12 2Z" /><line x1="12" y1="18" x2="12" y2="22" /></svg>
);
export const IcDashboard = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IcSite = (p: P) => (
  <svg {...base(p)}><path d="M12 2 6 11h4l-4 7h12l-4-7h4L12 2Z" /></svg>
);
export const IcMap = (p: P) => (
  <svg {...base(p)}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>
);
export const IcChart = (p: P) => (
  <svg {...base(p)}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
);
export const IcClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IcTruck = (p: P) => (
  <svg {...base(p)}><path d="M4 17V7a2 2 0 0 1 2-2h9l5 5v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><circle cx="8" cy="17" r="1.6" /><circle cx="17" cy="17" r="1.6" /></svg>
);
export const IcEuro = (p: P) => (
  <svg {...base(p)}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
);
export const IcUsers = (p: P) => (
  <svg {...base(p)}><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>
);
export const IcPlus = (p: P) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const IcMinus = (p: P) => (
  <svg {...base(p)}><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const IcSearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
);
export const IcChevron = (p: P) => (
  <svg {...base(p)}><polyline points="9 6 15 12 9 18" /></svg>
);
export const IcBack = (p: P) => (
  <svg {...base(p)}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);
export const IcPin = (p: P) => (
  <svg {...base(p)}><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="2.6" /></svg>
);
export const IcCamera = (p: P) => (
  <svg {...base(p)}><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13" r="3.6" /></svg>
);
export const IcDoc = (p: P) => (
  <svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>
);
export const IcTrash = (p: P) => (
  <svg {...base(p)}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
export const IcEdit = (p: P) => (
  <svg {...base(p)}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
);
export const IcCheck = (p: P) => (
  <svg {...base(p)}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IcMenu = (p: P) => (
  <svg {...base(p)}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
);
export const IcSun = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const IcMoon = (p: P) => (
  <svg {...base(p)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
);
export const IcBox = (p: P) => (
  <svg {...base(p)}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
);
export const IcBell = (p: P) => (
  <svg {...base(p)}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
);
export const IcWifiOff = (p: P) => (
  <svg {...base(p)}><line x1="2" y1="2" x2="22" y2="22" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M2 8.8a15 15 0 0 1 4.2-2.5M20 8.8a15 15 0 0 0-6-3.4" /><path d="M5 12.9a10 10 0 0 1 3-1.8M18.9 12.9A10 10 0 0 0 15 11" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
);
export const IcRuler = (p: P) => (
  <svg {...base(p)}><path d="M3 15 15 3l6 6L9 21Z" /><path d="M7 11l1.5 1.5M10 8l1.5 1.5M13 5l1.5 1.5M11 15l1.5 1.5" /></svg>
);
export const IcWarning = (p: P) => (
  <svg {...base(p)}><path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
export const IcStar = (p: P) => (
  <svg {...base(p)}><polygon points="12 3 14.6 9 21 9.5 16 13.8 17.6 20 12 16.5 6.4 20 8 13.8 3 9.5 9.4 9" /></svg>
);
export const IcRoute = (p: P) => (
  <svg {...base(p)}><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M8 19h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16" /></svg>
);
export const IcLogs = (p: P) => (
  <svg {...base(p)}><circle cx="7.5" cy="15" r="4" /><circle cx="16.5" cy="15" r="4" /><circle cx="12" cy="7.5" r="4" /></svg>
);
export const IcSettings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
);
export const IcDownload = (p: P) => (
  <svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
export const IcUpload = (p: P) => (
  <svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);
export const IcCloud = (p: P) => (
  <svg {...base(p)}><path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 19Z" /></svg>
);
export const IcPrint = (p: P) => (
  <svg {...base(p)}><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
);
export const IcReport = (p: P) => (
  <svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>
);
export const IcReceipt = (p: P) => (
  <svg {...base(p)}><path d="M5 2v20l2.5-1.5L10 22l2-1.5L14 22l2.5-1.5L19 22V2l-2.5 1.5L14 2l-2 1.5L10 2 7.5 3.5Z" /><line x1="8.5" y1="8" x2="15.5" y2="8" /><line x1="8.5" y1="12" x2="15.5" y2="12" /></svg>
);
export const IcLogout = (p: P) => (
  <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);
export const IcZap = (p: P) => (
  <svg {...base(p)}><polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" /></svg>
);
export const IcLock = (p: P) => (
  <svg {...base(p)}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
