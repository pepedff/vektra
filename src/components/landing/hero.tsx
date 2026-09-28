"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, Sparkles, Zap } from "lucide-react";
import { useRef } from "react";
import { EASE } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "./product-preview";

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 24, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.8, ease: EASE, delay },
});

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const previewY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.2]);

  return (
    <section id="inicio" ref={ref} className="relative overflow-hidden pt-32 pb-20 md:pt-40 lg:pb-32">
      <div className="grid-backdrop pointer-events-none absolute inset-0" />
      <motion.div style={{ y: glowY }} className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[8%] h-[480px] w-[520px] rounded-full bg-blue/[0.13] blur-[120px]" />
        <div className="absolute top-10 right-[4%] h-[420px] w-[460px] rounded-full bg-purple/[0.16] blur-[130px]" />
        <div className="absolute top-72 right-[28%] h-[260px] w-[300px] rounded-full bg-pink/[0.09] blur-[110px]" />
      </motion.div>

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 md:px-8 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
        <motion.div style={{ opacity: textOpacity }} className="max-w-[600px]">
          <motion.span
            {...enter(0.05)}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pr-3.5 pl-1.5 text-[11.5px] font-semibold tracking-[0.12em] text-fg/85 uppercase"
          >
            <span className="bg-brand-flow flex size-5 items-center justify-center rounded-full">
              <Sparkles className="size-3 text-white" />
            </span>
            Mais poder para seus projetos
          </motion.span>

          <h1 className="mt-6 text-[44px] leading-[1.03] font-extrabold tracking-[-0.035em] text-balance sm:text-[58px] lg:text-[66px]">
            <motion.span {...enter(0.15)} className="block">
              Chega de limites.
            </motion.span>
            <motion.span {...enter(0.28)} className="text-gradient-flow block pb-1">
              Crie sem parar.
            </motion.span>
          </h1>

          <motion.p {...enter(0.4)} className="mt-6 max-w-[500px] text-[16.5px] leading-relaxed text-muted md:text-[17px]">
            Licenças com créditos ilimitados para suas ferramentas de criação com IA. Pague via PIX, receba a
            ativação em segundos e acompanhe tudo em um painel feito para quem constrói todos os dias.
          </motion.p>

          <motion.div {...enter(0.52)} className="mt-9 flex flex-col gap-3 sm:flex-row">
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
          </motion.div>

          <motion.ul {...enter(0.64)} className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[13.5px] text-muted">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-green" strokeWidth={2.6} /> Ativação automática
            </li>
            <li className="flex items-center gap-2">
              <Zap className="size-4 text-orange" strokeWidth={2.4} /> Configuração rápida
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-green" strokeWidth={2.6} /> Acesso ao painel
            </li>
          </motion.ul>
        </motion.div>

        <motion.div
          style={{ y: previewY }}
          initial={{ opacity: 0, scale: 0.95, y: 40, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: EASE, delay: 0.35 }}
        >
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  );
}
