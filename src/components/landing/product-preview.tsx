"use client";

import { motion } from "framer-motion";
import { Check, CheckCircle2, KeyRound, ShoppingBag, Sparkles, Wallet, Users } from "lucide-react";
import { EASE } from "@/components/motion/reveal";

const BARS = [38, 52, 44, 63, 58, 72, 66, 84, 78, 92];

function MiniChart() {
  const w = 300;
  const h = 90;
  const pts = BARS.map((v, i) => [(i / (BARS.length - 1)) * w, h - (v / 100) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[90px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="pv-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00A8FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pv-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#00D5FF" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#pv-fill)" />
      <motion.path
        d={line}
        fill="none"
        stroke="url(#pv-line)"
        strokeWidth="2.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, ease: EASE, delay: 0.9 }}
      />
    </svg>
  );
}

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="pointer-events-none absolute -inset-6 rounded-[36px] bg-[radial-gradient(60%_60%_at_60%_40%,rgb(0_168_255/0.22),transparent_70%),radial-gradient(50%_50%_at_30%_80%,rgb(236_72_153/0.14),transparent_70%)] blur-2xl" />

      <div
        className="ring-gradient relative overflow-hidden rounded-[24px] bg-[#0f141d] shadow-[0_40px_100px_-30px_rgb(0_0_0/0.9)]"
        style={{
          ["--ring" as string]:
            "linear-gradient(140deg, rgb(0 213 255 / 0.7), rgb(124 58 237 / 0.45) 40%, rgb(236 72 153 / 0.5) 75%, rgb(255 117 24 / 0.45))",
        }}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="ml-3 truncate rounded-md bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] text-subtle">
            app.vektra.com.br/painel
          </span>
        </div>

        <div className="flex">
          <aside className="hidden w-[132px] shrink-0 flex-col gap-1 border-r border-line p-3 sm:flex">
            {[
              { icon: KeyRound, label: "Licenças", active: true },
              { icon: ShoppingBag, label: "Compras" },
              { icon: Wallet, label: "Pagamentos" },
              { icon: Users, label: "Afiliados" },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                  active ? "bg-blue/12 text-fg" : "text-subtle"
                }`}
              >
                <Icon className={`size-3.5 ${active ? "text-cyan" : ""}`} />
                {label}
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-blue/12 text-cyan ring-1 ring-blue/25">
                <KeyRound className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold">Licenças</p>
                <p className="text-[10.5px] text-subtle">Gerencie e acompanhe suas licenças.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { l: "Ativas", v: "9", c: "text-green" },
                { l: "Créditos", v: "∞", c: "text-cyan" },
                { l: "Economia", v: "R$ 1,2k", c: "text-violet" },
              ].map((s, i) => (
                <motion.div
                  key={s.l}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.5, ease: EASE }}
                  className="rounded-xl border border-line bg-card px-3 py-2.5"
                >
                  <p className="text-[9.5px] font-semibold tracking-wider text-subtle uppercase">{s.l}</p>
                  <p className={`mt-1 text-[17px] font-bold tabular ${s.c}`}>{s.v}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-line bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10.5px] font-semibold text-muted">Uso de créditos · 30 dias</p>
                <span className="rounded-full bg-green/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-green">+24%</span>
              </div>
              <MiniChart />
            </div>

            <div className="mt-3 space-y-1.5">
              {["VKT-8F2A-91C0", "VKT-3B7E-44D1"].map((k, i) => (
                <motion.div
                  key={k}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.12, duration: 0.5, ease: EASE }}
                  className="flex items-center justify-between rounded-lg border border-line bg-white/[0.015] px-3 py-2"
                >
                  <span className="font-mono text-[10.5px] text-fg/80">{k}</span>
                  <span className="flex items-center gap-1 text-[9.5px] font-semibold text-green uppercase">
                    <span className="size-1.5 rounded-full bg-green" /> Ativa
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 30, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 1.6, type: "spring", stiffness: 260, damping: 26 }}
        className="absolute -bottom-6 -left-3 w-[250px] sm:-left-10"
      >
        <div className="animate-float">
          <div
            className="ring-gradient relative overflow-hidden rounded-[18px] bg-[#121824]/90 p-3.5 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.85)] backdrop-blur-xl"
            style={{ ["--ring" as string]: "linear-gradient(135deg, rgb(0 212 154 / 0.5), rgb(255 255 255 / 0.04))" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgb(0_212_154/0.16),transparent_55%)]" />
            <div className="relative flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green/15 text-green ring-1 ring-green/30">
                <Check className="size-3.5" strokeWidth={2.8} />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">PIX confirmado</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted">Licença Pro ativada em 4 segundos.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.6, ease: EASE }}
        className="absolute -top-4 -right-2 hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#151b26]/90 px-3 py-1.5 text-[11.5px] font-semibold shadow-[0_10px_30px_-10px_rgb(0_0_0/0.8)] backdrop-blur sm:flex"
      >
        <Sparkles className="size-3.5 text-orange" />
        Créditos ilimitados
        <CheckCircle2 className="size-3.5 text-green" />
      </motion.div>
    </div>
  );
}
