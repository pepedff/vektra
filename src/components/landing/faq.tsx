"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";
import { SectionHeading } from "./section-heading";

const ITEMS = [
  {
    q: "Em quanto tempo minha licença é ativada?",
    a: "Assim que o PIX é confirmado pelo banco, normalmente em até 10 segundos. A licença aparece no seu painel e você recebe uma notificação.",
  },
  {
    q: "Posso testar antes de pagar?",
    a: "Sim. O teste grátis libera uma licença com créditos limitados por 3 dias, sem pedir cartão. Você pode fazer upgrade a qualquer momento.",
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "PIX com confirmação automática é o principal. Cartão de crédito e boleto estão disponíveis nos planos anuais.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Pode. O upgrade é imediato e o valor já pago é abatido proporcionalmente. O downgrade vale a partir do próximo ciclo.",
  },
  {
    q: "Como funciona o programa de afiliados?",
    a: "Você recebe um link exclusivo e ganha 20% de comissão recorrente em cada venda indicada. O saque é feito via PIX a partir de R$ 50.",
  },
  {
    q: "E se eu quiser cancelar?",
    a: "Cancele direto no painel, sem ligação nem formulário. Se cancelar em até 7 dias da primeira compra, devolvemos 100% do valor.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="duvidas" className="relative py-24 md:py-32">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHeading
          align="left"
          title="Dúvidas frequentes"
          description="Não encontrou o que procurava? Nosso time responde em minutos pelo suporte."
        />
        <Stagger className="divide-y divide-line border-y border-line" gap={0.06}>
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <StaggerItem key={item.q}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span
                    className={cn(
                      "text-[15.5px] font-medium transition-colors",
                      isOpen ? "text-fg" : "text-fg/80 group-hover:text-fg",
                    )}
                  >
                    {item.q}
                  </span>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                      isOpen ? "rotate-45 border-blue/40 bg-blue/10 text-cyan" : "border-line text-muted group-hover:border-white/15",
                    )}
                  >
                    <Plus className="size-4" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[60ch] pr-12 pb-5 text-[14.5px] leading-relaxed text-muted">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
