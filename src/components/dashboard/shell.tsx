"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { ChevronRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/button";
import { NotificationBell } from "@/features/notifications/bell";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, clientNav, findNavItem } from "@/lib/nav";
import { Sidebar, type PanelUser, type PanelVariant } from "./sidebar";

const EASE = [0.16, 1, 0.3, 1] as const;

export function DashboardShell({
  variant,
  user,
  children,
  banner,
}: {
  variant: PanelVariant;
  user: PanelUser;
  children: ReactNode;
  banner?: ReactNode;
}) {
  const nav = variant === "admin" ? ADMIN_NAV : clientNav(Boolean(user.isReseller));
  const pathname = usePathname();
  const reduce = Boolean(useReducedMotion());
  const [drawer, setDrawer] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const current = findNavItem(nav, pathname);
  const CurrentIcon = current?.icon;

  // Header muda de "transparente" para "vidro" quando a página rola
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  // Trava a rolagem e fecha com Esc enquanto a gaveta está aberta
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  // Fecha a gaveta ao trocar de página ou ao virar tela grande
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setDrawer(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="relative min-h-dvh bg-bg">
      <Ambient reduce={reduce} />

      {/* Desktop: o Sidebar já é um cartão flutuante, então o aside é só o trilho */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] lg:block">
        <Sidebar nav={nav} variant={variant} user={user} />
      </aside>

      {/* Mobile: gaveta com arrastar para fechar */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div
              className="absolute inset-0 bg-[#05070b]/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%" }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 38 }}
              drag={reduce ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.5, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -500) setDrawer(false);
              }}
              className="absolute inset-y-0 left-0 w-[300px] max-w-[80vw]"
            >
              <Sidebar nav={nav} variant={variant} user={user} onNavigate={() => setDrawer(false)} />
              {/* Botão de fechar fica fora do cartão, flutuando ao lado */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ delay: reduce ? 0 : 0.15, type: "spring", stiffness: 420, damping: 26 }}
                className="absolute top-5 -right-14"
              >
                <IconButton
                  label="Fechar menu"
                  onClick={() => setDrawer(false)}
                  className="rounded-full border border-line bg-[#10151f] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.9)]"
                >
                  <X className="size-5" />
                </IconButton>
              </motion.div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="relative lg:pl-[280px]">
        <header className="sticky top-0 z-30 px-3 pt-3 md:px-6 lg:pl-0">
          <div
            className={cn(
              "mx-auto flex h-14 max-w-[1320px] items-center gap-3 rounded-2xl border px-3 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 md:px-4",
              scrolled
                ? "border-line bg-[#10151f]/75 shadow-[0_16px_40px_-24px_rgb(0_0_0/0.9)] backdrop-blur-xl"
                : "border-transparent bg-transparent",
            )}
          >
            <IconButton label="Abrir menu" onClick={() => setDrawer(true)} className="lg:hidden">
              <Menu className="size-5" />
            </IconButton>

            {/* Trilha: Painel › Página atual, com troca animada */}
            <nav aria-label="Você está em" className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="hidden text-subtle sm:inline">{variant === "admin" ? "Admin" : "Painel"}</span>
              <ChevronRight className="hidden size-3.5 text-subtle/60 sm:block" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={current?.href ?? pathname}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(3px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(3px)" }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="flex min-w-0 items-center gap-2 font-semibold text-fg"
                >
                  {CurrentIcon && (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#00a8ff,#7c3aed)] text-white shadow-[0_6px_16px_-6px_rgb(0_168_255/0.8)]">
                      <CurrentIcon className="size-3.5" strokeWidth={2.2} />
                    </span>
                  )}
                  <span className="truncate">{current?.label}</span>
                </motion.span>
              </AnimatePresence>
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1320px] px-4 pt-6 pb-16 md:px-8 md:pt-8 lg:pl-5">
          {banner && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {banner}
            </motion.div>
          )}
          <motion.div
            key={pathname}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/** Luzes de fundo bem sutis, azul e roxo, que se movem devagar */
function Ambient({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-48 right-[-8%] size-[560px] rounded-full bg-blue/[0.07] blur-[120px]"
        animate={reduce ? undefined : { x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-25%] left-[12%] size-[520px] rounded-full bg-purple/[0.06] blur-[120px]"
        animate={reduce ? undefined : { x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Grade quase invisível que some nas bordas */}
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.018)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.018)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
    </div>
  );
}