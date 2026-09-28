"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/cn";

export type StatTone = "blue" | "green" | "red" | "purple" | "orange" | "cyan" | "pink";

const TONES: Record<StatTone, { icon: string; glow: string; hover: string }> = {
  blue: { icon: "bg-blue/12 text-blue ring-blue/25", glow: "rgb(0 168 255 / 0.16)", hover: "hover:border-blue/25" },
  cyan: { icon: "bg-cyan/12 text-cyan ring-cyan/25", glow: "rgb(0 213 255 / 0.14)", hover: "hover:border-cyan/25" },
  green: { icon: "bg-green/12 text-green ring-green/25", glow: "rgb(0 212 154 / 0.14)", hover: "hover:border-green/25" },
  red: { icon: "bg-red/12 text-red ring-red/25", glow: "rgb(255 77 109 / 0.14)", hover: "hover:border-red/25" },
  purple: { icon: "bg-purple/15 text-violet ring-purple/30", glow: "rgb(124 58 237 / 0.18)", hover: "hover:border-purple/30" },
  orange: { icon: "bg-orange/12 text-orange ring-orange/25", glow: "rgb(255 117 24 / 0.14)", hover: "hover:border-orange/25" },
  pink: { icon: "bg-pink/12 text-pink ring-pink/25", glow: "rgb(236 72 153 / 0.14)", hover: "hover:border-pink/25" },
};

export function StatCard({
  label,
  value,
  format,
  icon: Icon,
  tone = "blue",
  delta,
  hint,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon: LucideIcon;
  tone?: StatTone;
  delta?: number;
  hint?: string;
}) {
  const t = TONES[tone];
  const up = (delta ?? 0) >= 0;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group relative overflow-hidden rounded-panel border border-line bg-card p-5 transition-[border-color,box-shadow] duration-300 hover:shadow-[0_18px_40px_-20px_rgb(0_0_0/0.9)]",
        t.hover,
      )}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, ${t.glow}, transparent 70%)` }}
      />
      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]",
            t.icon,
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      </div>
      <p className="relative mt-4 text-[28px] leading-none font-bold tracking-tight tabular">
        <CountUp to={value} format={format} duration={1.2} />
      </p>
      <div className="relative mt-3 flex items-center gap-2 text-[12px]">
        {delta !== undefined && (
          <span className={cn("inline-flex items-center gap-1 font-semibold", up ? "text-green" : "text-red")}>
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {up ? "+" : ""}
            {delta.toLocaleString("pt-BR")}%
          </span>
        )}
        {hint && <span className="text-subtle">{hint}</span>}
      </div>
    </motion.div>
  );
}
