"use client";

import { ArrowRight, BookOpen, Mail, MessageCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";
import { SupportChat, type SupportChatHandle } from "./support-chat";

const CHANNELS = [
  {
    icon: MessageCircle,
    title: "Chat ao vivo",
    text: "A IA do navegador responde com a base do produto. O que ela não souber vai para o e-mail.",
    action: "Abrir chat",
    href: "#chat",
  },
  {
    icon: Mail,
    title: "E-mail",
    text: "suporte@vektra.com.br — respondemos em até 2 horas úteis.",
    action: "Enviar e-mail",
    href: "mailto:suporte@vektra.com.br",
  },
  {
    icon: BookOpen,
    title: "Central de ajuda",
    text: "Guias passo a passo para ativação, pagamentos e revenda.",
    action: "Ver artigos",
    href: "#duvidas",
  },
];

export function Support() {
  const [chat, setChat] = useState(false);
  const chatRef = useRef<SupportChatHandle>(null);
  return (
    <section id="suporte" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeading
          title="Gente de verdade do outro lado"
          description="Suporte em português, por quem conhece o produto de ponta a ponta."
        />
        <Stagger className="mt-12 grid gap-4 md:grid-cols-3" gap={0.1}>
          {CHANNELS.map((c) => (
            <StaggerItem key={c.title}>
              {c.href === "#chat" ? (
              <button
                type="button"
                onClick={() => {
                  chatRef.current?.boot();
                  setChat(true);
                }}
                className="group flex h-full w-full flex-col rounded-[22px] border border-line bg-card/60 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.11] hover:bg-card"
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-white/[0.03] text-cyan transition-colors group-hover:border-blue/30 group-hover:bg-blue/10">
                  <c.icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 text-[16px] font-semibold">{c.title}</h3>
                <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-muted">{c.text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-cyan">
                  {c.action}
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
              ) : (
              <a
                href={c.href}
                className="group flex h-full flex-col rounded-[22px] border border-line bg-card/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.11] hover:bg-card"
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-white/[0.03] text-cyan transition-colors group-hover:border-blue/30 group-hover:bg-blue/10">
                  <c.icon className="size-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 text-[16px] font-semibold">{c.title}</h3>
                <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-muted">{c.text}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-cyan">
                  {c.action}
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
              )}
            </StaggerItem>
          ))}
        </Stagger>
        <SupportChat ref={chatRef} open={chat} onClose={() => setChat(false)} />

        <Reveal className="relative mt-20 overflow-hidden rounded-[28px] border border-line bg-[#0f141d] px-6 py-14 text-center md:px-12 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_120%,rgb(124_58_237/0.28),transparent_70%),radial-gradient(40%_60%_at_15%_0%,rgb(0_168_255/0.14),transparent_70%),radial-gradient(40%_60%_at_85%_0%,rgb(236_72_153/0.12),transparent_70%)]" />
          <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative">
            <h2 className="mx-auto max-w-[620px] text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-balance md:text-[44px]">
              Seu próximo projeto não precisa esperar o limite resetar.
            </h2>
            <p className="mx-auto mt-4 max-w-[460px] text-[16px] text-muted">
              Ative agora e volte a criar em menos de um minuto.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                href="#planos"
                variant="primary"
                size="lg"
                trailingIcon={<ArrowRight className="size-[18px]" strokeWidth={2.4} />}
              >
                Quero começar agora
              </Button>
              <Button href="/login?modo=teste" variant="secondary" size="lg">
                Testar grátis
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
