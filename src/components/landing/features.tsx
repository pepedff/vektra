"use client";

import { motion } from "framer-motion";
import { Bell, Fingerprint, LineChart, ShieldCheck, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { CountUp } from "@/components/motion/count-up";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ActionButton, type ActionState } from "@/components/ui/action-button";
import { ToastCard, useToast } from "@/components/ui/toast";
import type { ToastType } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { SectionHeading } from "./section-heading";

const STATS = [
  { to: 12400, label: "criadores ativos", prefix: "+" },
  { to: 98200, label: "licenças ativadas" },
  { to: 4, label: "segundos para ativar", suffix: "s" },
  { to: 99.98, label: "de disponibilidade", suffix: "%", decimals: 2 },
];

export function StatsStrip() {
  return (
    <section className="relative border-y border-line bg-bg-2/60">
      <Stagger className="mx-auto grid max-w-[1200px] grid-cols-2 gap-y-8 px-5 py-12 md:grid-cols-4 md:px-8" gap={0.1}>
        {STATS.map((s) => (
          <StaggerItem key={s.label} className="text-center md:border-l md:border-line md:first:border-l-0">
            <p className="text-[30px] font-bold tracking-tight tabular md:text-[36px]">
              {s.prefix}
              <CountUp
                to={s.to}
                format={(n) =>
                  n.toLocaleString("pt-BR", {
                    minimumFractionDigits: s.decimals ?? 0,
                    maximumFractionDigits: s.decimals ?? 0,
                  })
                }
              />
              {s.suffix}
            </p>
            <p className="mt-1 text-[13.5px] text-muted">{s.label}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

const DEMO_TOASTS: Record<ToastType, { title: string; description: string; label: string; dot: string }> = {
  success: { title: "Licença ativada", description: "Sua licença Pro já está disponível no painel.", label: "Sucesso", dot: "bg-green" },
  error: { title: "Revise seus dados", description: "Preencha nome completo, e-mail e os campos pedidos.", label: "Erro", dot: "bg-red" },
  warning: { title: "Licença expira em 2 dias", description: "Renove agora e mantenha seus créditos ilimitados.", label: "Aviso", dot: "bg-yellow" },
  info: { title: "Nova versão disponível", description: "Veja o que mudou no painel do cliente.", label: "Info", dot: "bg-blue" },
};

function NotificationsTile() {
  const { toast } = useToast();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5">
        <Bell className="size-5 text-cyan" strokeWidth={1.8} />
        <h3 className="text-[17px] font-semibold tracking-tight">Avisos que chegam na hora certa</h3>
      </div>
      <p className="mt-2 max-w-[440px] text-[14px] leading-relaxed text-muted">
        Pagamento confirmado, licença perto de expirar, novidade no produto. Tudo aparece no seu painel, sem precisar
        abrir o e-mail. Clique para testar.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(DEMO_TOASTS) as ToastType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toast({ type: t, title: DEMO_TOASTS[t].title, description: DEMO_TOASTS[t].description })}
            className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3.5 text-[13px] font-medium text-fg/90 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05] active:scale-95"
          >
            <span className={cn("size-2 rounded-full", DEMO_TOASTS[t].dot)} />
            {DEMO_TOASTS[t].label}
          </button>
        ))}
      </div>
      <div className="relative mt-7 flex-1">
        <div className="space-y-2.5 sm:max-w-[380px] sm:translate-x-8">
          <ToastCard type="error" title={DEMO_TOASTS.error.title} description={DEMO_TOASTS.error.description} />
          <ToastCard
            type="success"
            title={DEMO_TOASTS.success.title}
            description={DEMO_TOASTS.success.description}
            className="opacity-70 sm:translate-x-6"
          />
        </div>
      </div>
    </div>
  );
}

function CheckoutTile() {
  const [state, setState] = useState<ActionState>("idle");
  const timer = useRef<number | undefined>(undefined);
  const run = () => {
    if (state !== "idle") return;
    setState("loading");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setState("success");
      timer.current = window.setTimeout(() => setState("idle"), 2200);
    }, 1600);
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5">
        <Zap className="size-5 text-orange" strokeWidth={1.8} />
        <h3 className="text-[17px] font-semibold tracking-tight">Checkout PIX em um clique</h3>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Cobrança gerada na hora, confirmação automática e licença entregue sem intervenção.
      </p>
      <div className="mt-auto pt-8">
        <div className="mb-3 flex items-baseline justify-between text-[13px]">
          <span className="text-muted">Plano Pro · mensal</span>
          <span className="font-semibold tabular">R$ 119,90</span>
        </div>
        <ActionButton
          state={state}
          onClick={run}
          loadingText="Gerando cobrança..."
          successText="PIX gerado com sucesso"
        >
          Gerar PIX de R$ 119,90
        </ActionButton>
      </div>
    </div>
  );
}

const SMALL = [
  {
    icon: ShieldCheck,
    color: "text-green",
    title: "Pagamento protegido",
    text: "Cobranças processadas por gateway certificado. Não armazenamos dados sensíveis.",
  },
  {
    icon: Fingerprint,
    color: "text-violet",
    title: "Licenças únicas",
    text: "Cada chave é vinculada à sua conta, com controle de sessões e dispositivos.",
  },
  {
    icon: LineChart,
    color: "text-cyan",
    title: "Tudo mensurado",
    text: "Licença, download da extensão, pagamentos e dispositivos em um só painel.",
  },
];

export function Features() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeading
          title="Feito para quem não pode parar no meio do projeto"
          description="Cada detalhe foi pensado para tirar atrito do caminho entre a ideia e o resultado."
        />
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <Reveal className="rounded-[22px] border border-line bg-card p-6 md:p-7 lg:col-span-2">
            <NotificationsTile />
          </Reveal>
          <Reveal delay={0.1} className="relative overflow-hidden rounded-[22px] border border-line bg-card p-6 md:p-7">
            <div className="pointer-events-none absolute -right-20 -bottom-20 size-64 rounded-full bg-blue/10 blur-3xl" />
            <div className="relative h-full">
              <CheckoutTile />
            </div>
          </Reveal>
        </div>
        <Stagger className="mt-4 grid gap-4 md:grid-cols-3" gap={0.1}>
          {SMALL.map((f) => (
            <StaggerItem key={f.title}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="h-full rounded-[22px] border border-line bg-card/60 p-6 transition-colors duration-300 hover:border-white/[0.11] hover:bg-card"
              >
                <f.icon className={cn("size-5", f.color)} strokeWidth={1.8} />
                <h3 className="mt-4 text-[15.5px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{f.text}</p>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
