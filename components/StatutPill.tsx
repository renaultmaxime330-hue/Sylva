import type { Statut } from "@/lib/db";
import { statutInfo } from "@/lib/format";

export default function StatutPill({ statut, sm }: { statut: Statut; sm?: boolean }) {
  const info = statutInfo(statut);
  return <span className={`pill ${info.cls}${sm ? " sm" : ""}`}>{info.label}</span>;
}
