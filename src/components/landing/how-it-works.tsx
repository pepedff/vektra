"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Check, KeyRound, LayoutGrid, QrCode } from "lucide-react";
import { useRef } from "react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    icon: LayoutGrid,
    title: "Escolha o plano",
    text: "Starter, Pro ou Scale. Troque quando quiser, sem multa e sem burocracia.",
    detail: (
      <div className="flex gap-1.5">
        {["Starter", "Pro", "Scale"].map((p) => (
          <span
            key={p}
            className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold ${
              p === "Pro" ? "border-blue/40 bg-blue/10 text-cyan" : "border-line text-subtle"
            }`}
          >
            {p}
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: QrCode,
    title: "Pague via PIX",
    text: "O QR Code é gerado na hora. A confirmação chega em poucos segundos.",
    detail: (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5 py-1.5 text-[11.5px]">
        <span className="size-1.5 animate-pulse-soft rounded-full bg-yellow" />
        <span className="text-muted">Aguardando pagamento</span>
        <span className="ml-auto font-mono text-fg/80">R$ 119,90</span>
      </div>
    ),
  },
  {
    icon: KeyRound,
    title: "Receba e crie",
    text: "Sua licença é ativada automaticamente e já aparece no painel.",
    detail: (
      <div className="flex items-center gap-2 rounded-lg border border-green/25 bg-green/[0.06] px-2.5 py-1.5 text-[11.5px]">
        <Check className="size-3.5 text-green" strokeWidth={2.8} />
        <span className="font-mono text-fg/85">VKT-8F2A-91C0</span>
        <span className="ml-auto font-semibold text-green">Ativa</span>
      </div>
    ),
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const scaleX = useTransform(progress, [0, 1], [0, 1]);

  return (
    <section id="como-funciona" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeading
          title="Do pagamento à criação em menos de um minuto"
          description="Sem formulário longo, sem espera por aprovação manual. Três passos e você volta a criar."
        />

        <div ref={ref} className="relative mt-16">
          <div className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-line md:block">
            <motion.div
              style={{ scaleX }}
              className="h-full origin-left bg-[linear-gradient(90deg,#00d5ff,#7c3aed,#ec4899)]"
            />
          </div>

          <Stagger className="grid gap-10 md:grid-cols-3 md:gap-8" gap={0.14}>
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title} className="relative flex flex-col items-center text-center">
                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-line-strong bg-card shadow-[0_10px_30px_-12px_rgb(0_0_0/0.8)]">
                  <s.icon className="size-6 text-cyan" strokeWidth={1.8} />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border border-line bg-bg-2 font-mono text-[11px] font-semibold text-muted">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-[18px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-[300px] text-[14.5px] leading-relaxed text-muted">{s.text}</p>
                <div className="mt-5 w-full max-w-[280px]">{s.detail}</div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
