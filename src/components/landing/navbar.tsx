"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const LINKS = [
  { id: "inicio", label: "Início" },
  { id: "planos", label: "Planos" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "duvidas", label: "Dúvidas" },
  { id: "suporte", label: "Suporte" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("inicio");
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-500",
        scrolled || open ? "glass border-white/[0.06]" : "border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Logo />

        <ul className="hidden items-center gap-1 rounded-full border border-white/[0.05] bg-white/[0.02] p-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                className={cn(
                  "relative block rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors duration-200",
                  active === l.id ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {active === l.id && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-white/[0.07]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Entrar
          </Button>
          <Button href="/painel" variant="secondary" size="sm" trailingIcon={<ArrowRight className="size-3.5" />}>
            Acessar painel
          </Button>
          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex size-9 items-center justify-center rounded-xl text-fg hover:bg-white/[0.06] lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/[0.05] px-5 lg:hidden"
          >
            {LINKS.map((l, i) => (
              <motion.li
                key={l.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i + 0.05 }}
              >
                <a
                  href={`#${l.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-12 items-center border-b border-white/[0.04] text-[15px] font-medium",
                    active === l.id ? "text-fg" : "text-muted",
                  )}
                >
                  {l.label}
                </a>
              </motion.li>
            ))}
            <li className="py-4">
              <Button href="/login" variant="ghost" size="md" className="w-full">
                Entrar na conta
              </Button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
