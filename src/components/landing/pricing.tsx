"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";
import type { Plan } from "@/lib/supabase/types";
import { SectionHeading } from "./section-heading";

export function Pricing({ plans }: { plans: Plan[] }) {
  return (
    <section id="planos" className="relative py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-[420px] max-w-[900px] rounded-full bg-purple/[0.07] blur-[140px]" />
      <div className="relative mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeading
          title="Um plano para cada ritmo de criação"
          description="Todos incluem ativação automática, painel do cliente e suporte. Sem fidelidade: pague só quando precisar."
        />

        {plans.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-[24px] border border-line bg-card/70 p-8 text-center">
            <p className="text-[15px] font-semibold">Planos em atualização</p>
            <p className="mt-2 text-[13.5px] text-muted">Crie sua conta e ganhe 3 dias de teste enquanto isso.</p>
            <Button href="/login?modo=teste" variant="primary" size="md" className="mt-6" trailingIcon={<ArrowRight className="size-4" />}>
              Começar teste grátis
            </Button>
          </div>
        ) : (
          <Stagger className="mt-12 grid items-stretch gap-4 lg:grid-cols-3" gap={0.1}>
            {plans.map((plan) => (
              <StaggerItem key={plan.id} className="h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-[24px] p-7",
                    plan.highlight ? "ring-gradient bg-[#131a26] shadow-[0_30px_80px_-30px_rgb(124_58_237/0.45)]" : "border border-line bg-card/70",
                  )}
                  style={
                    plan.highlight
                      ? { ["--ring" as string]: "linear-gradient(160deg, rgb(0 213 255 / 0.7), rgb(124 58 237 / 0.5) 45%, rgb(236 72 153 / 0.55))" }
                      : undefined
                  }
                >
                  {plan.highlight && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(70%_100%_at_50%_0%,rgb(0_168_255/0.14),transparent)]" />
                  )}
                  <div className="relative flex items-center justify-between">
                    <h3 className="text-[18px] font-semibold">{plan.name}</h3>
                    {plan.highlight && <span className="bg-brand-flow rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">Mais escolhido</span>}
                  </div>
                  <p className="relative mt-2 text-[14px] leading-relaxed text-muted">{plan.description}</p>

                  <div className="relative mt-6 flex items-baseline gap-1.5">
                    <span className="text-[40px] font-bold tracking-tight tabular">{formatBRL(plan.price_cents / 100)}</span>
                    <span className="text-[14px] text-muted">/{plan.duration_days} dias</span>
                  </div>
                  <p className="relative mt-1 h-5 text-[12.5px] text-subtle">Pagamento único via PIX</p>

                  <p
                    className={cn(
                      "relative mt-6 rounded-xl border px-3.5 py-2.5 text-[13.5px] font-semibold",
                      plan.highlight ? "border-blue/25 bg-blue/[0.08] text-cyan" : "border-line bg-white/[0.02] text-fg/85",
                    )}
                  >
                    {plan.credits}
                  </p>

                  <ul className="relative mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[14px] text-fg/85">
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full",
                            plan.highlight ? "bg-green/15 text-green" : "bg-white/[0.06] text-muted",
                          )}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    href={`/painel/compras?plano=${encodeURIComponent(plan.id)}`}
                    variant={plan.highlight ? "primary" : "secondary"}
                    size="md"
                    className="relative mt-8 h-12 w-full"
                    trailingIcon={<ArrowRight className="size-4" />}
                  >
                    Assinar {plan.name}
                  </Button>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
