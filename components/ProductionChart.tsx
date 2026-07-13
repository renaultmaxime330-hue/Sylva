"use client";

type Point = { label: string; volume: number };

export default function ProductionChart({ data }: { data: Point[] }) {
  const n = Math.max(data.length, 1);
  const max = Math.max(1, ...data.map((d) => d.volume));
  const W = 760, H = 240;
  const padL = 10, padR = 10, padT = 22, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const slot = chartW / n;
  const barW = Math.min(slot * 0.64, 46);

  // 3 lignes de repère horizontales
  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f * 10) / 10);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Volume produit par période">
        {/* Grille */}
        {gridVals.map((v, i) => {
          const y = padT + chartH - (v / max) * chartH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} style={{ stroke: "var(--border)" }} strokeWidth={1} strokeDasharray="3 4" />
              <text x={W - padR} y={y - 3} textAnchor="end" style={{ fill: "var(--text-muted)", fontSize: 10 }}>{v}</text>
            </g>
          );
        })}
        {/* Base */}
        <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} style={{ stroke: "var(--border)" }} strokeWidth={1.5} />

        {data.map((d, i) => {
          const h = (d.volume / max) * chartH;
          const cx = padL + i * slot + slot / 2;
          const x = cx - barW / 2;
          const y = padT + chartH - h;
          return (
            <g key={i}>
              {d.volume > 0 && (
                <rect x={x} y={y} width={barW} height={h} rx={4} style={{ fill: "var(--accent)" }}>
                  <title>{d.label} : {d.volume} m³</title>
                </rect>
              )}
              {d.volume > 0 && (
                <text x={cx} y={y - 5} textAnchor="middle" style={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }}>{d.volume}</text>
              )}
              <text x={cx} y={H - 10} textAnchor="middle" style={{ fill: "var(--text-muted)", fontSize: 10 }}>{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
