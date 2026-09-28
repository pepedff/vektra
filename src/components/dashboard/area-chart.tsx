"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";
export interface Point {
  label: string;
  value: number;
}

const H = 280;
const PAD = { top: 16, right: 12, bottom: 30, left: 52 };

function niceMax(v: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * exp;
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function AreaChart({
  data,
  format,
  seriesKey,
}: {
  data: Point[];
  format: (n: number) => string;
  seriesKey: string;
}) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { pts, line, area, ticks, max } = useMemo(() => {
    const max = niceMax(Math.max(...data.map((d) => d.value)) * 1.08);
    const innerW = width - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const pts = data.map(
      (d, i) =>
        [PAD.left + (i / Math.max(1, data.length - 1)) * innerW, PAD.top + innerH - (d.value / max) * innerH] as [
          number,
          number,
        ],
    );
    const line = smoothPath(pts);
    const area = `${line} L${pts[pts.length - 1][0]},${H - PAD.bottom} L${pts[0][0]},${H - PAD.bottom} Z`;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ value: max * f, y: PAD.top + innerH - f * innerH }));
    return { pts, line, area, ticks, max };
  }, [data, width]);

  const labelEvery = Math.ceil(data.length / Math.max(3, Math.floor(width / 70)));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    pts.forEach(([px], i) => {
      if (Math.abs(px - x) < Math.abs(pts[best][0] - x)) best = i;
    });
    setHover(best);
  };

  const hp = hover !== null ? pts[hover] : null;

  return (
    <div ref={wrap} className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${H}`}
        width="100%"
        height={H}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Gráfico de receita. Máximo do eixo: ${format(max)}`}
        className="touch-pan-y"
      >
        <defs>
          <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00A8FF" stopOpacity="0.32" />
            <stop offset="0.55" stopColor="#7C3AED" stopOpacity="0.12" />
            <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#00D5FF" />
            <stop offset="0.5" stopColor="#00A8FF" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t.value}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke="rgb(255 255 255 / 0.05)"
              strokeDasharray={t.value === 0 ? undefined : "3 5"}
            />
            <text x={PAD.left - 10} y={t.y + 4} textAnchor="end" className="fill-subtle text-[10.5px] tabular">
              {format(t.value)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.label}
              x={pts[i][0]}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              className="fill-subtle text-[10.5px]"
            >
              {d.label}
            </text>
          ) : null,
        )}

        <AnimatePresence mode="wait">
          <motion.g key={seriesKey} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <motion.path
              d={area}
              fill={`url(#${id}-area)`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.25 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke={`url(#${id}-line)`}
              strokeWidth={2.4}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: "drop-shadow(0 6px 12px rgb(0 168 255 / 0.35))" }}
            />
          </motion.g>
        </AnimatePresence>

        {hp && (
          <g pointerEvents="none">
            <line x1={hp[0]} x2={hp[0]} y1={PAD.top} y2={H - PAD.bottom} stroke="rgb(255 255 255 / 0.12)" />
            <circle cx={hp[0]} cy={hp[1]} r={9} fill="rgb(0 168 255 / 0.18)" />
            <circle cx={hp[0]} cy={hp[1]} r={4.5} fill="#0B0E14" stroke="#00D5FF" strokeWidth={2.4} />
          </g>
        )}
      </svg>

      <AnimatePresence>
        {hp && hover !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-10 rounded-xl border border-line bg-[#1a2130]/95 px-3 py-2 shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] backdrop-blur"
            style={{
              left: `${(hp[0] / width) * 100}%`,
              top: hp[1] - 12,
              translate: hp[0] > width * 0.75 ? "-105% -100%" : hp[0] < width * 0.2 ? "5% -100%" : "-50% -100%",
            }}
          >
            <p className="text-[11px] text-muted">{data[hover].label}</p>
            <p className="text-[14px] font-semibold tabular">{format(data[hover].value)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
