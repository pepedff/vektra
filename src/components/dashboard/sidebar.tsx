"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronsUpDown, Download, LogOut, Repeat, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { NavGroup } from "@/lib/nav";

export type PanelVariant = "client" | "admin";

export type PanelUser = { name: string; email: string; roleLabel: string; isAdmin: boolean; isReseller?: boolean };

const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: "spring", stiffness: 450, damping: 36 } as const;

export function Sidebar({
  nav,
  variant,
  user,
  onNavigate,
}: {
  nav: NavGroup[];
  variant: PanelVariant;
  user: PanelUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = Boolean(useReducedMotion());
  const [signingOut, startSignOut] = useTransition();
  const [hovered, setHovered] = useState<string | null>(null);
  const home = variant === "admin" ? "/admin" : "/painel";
  const displayName = user.name || user.email;

  const menu: DropdownItem[] = [
    { label: "Configurações", icon: Settings, onSelect: () => router.push(`${home}/configuracoes`) },
    ...(user.isAdmin
      ? [
          {
            label: variant === "admin" ? "Ver painel do cliente" : "Ver painel admin",
            icon: Repeat,
            onSelect: () => router.push(variant === "admin" ? "/painel" : "/admin"),
          },
        ]
      : []),
    {
      label: signingOut ? "Saindo..." : "Sair",
      icon: LogOut,
      danger: true,
      separatorBefore: true,
      onSelect: () => startSignOut(() => signOut()),
    },
  ];

  // Índice contínuo para a entrada em cascata atravessar os grupos
  let order = 0;
  const enter = (i: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
      : { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.05 + i * 0.035, duration: 0.4, ease: EASE } };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] shrink-0 items-center px-5">
        <Logo href={home} subtitle={variant === "admin" ? "Painel administrativo" : "Painel do cliente"} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4" aria-label="Navegação do painel" onMouseLeave={() => setHovered(null)}>
        {nav.map((group) => (
          <div key={group.label} className="mb-6 last:mb-4">
            <motion.p {...enter(order++)} className="px-3 pb-1.5 text-[12px] font-medium text-subtle">
              {group.label}
            </motion.p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <motion.li key={item.href} {...enter(order++)} onMouseEnter={() => setHovered(item.href)}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue/40",
                        active ? "text-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      {/* Realce de hover que desliza entre os itens */}
                      <AnimatePresence>
                        {hovered === item.href && !active && (
                          <motion.span
                            layoutId={reduce ? undefined : `sidebar-hover-${variant}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            transition={SPRING}
                            className="absolute inset-0 rounded-xl bg-white/[0.04]"
                          />
                        )}
                      </AnimatePresence>

                      {/* Item ativo: fundo + barrinha ciano na lateral */}
                      {active && (
                        <>
                          <motion.span
                            layoutId={reduce ? undefined : `sidebar-active-${variant}`}
                            transition={SPRING}
                            className="absolute inset-0 rounded-xl border border-blue/20 bg-[linear-gradient(90deg,rgb(0_168_255/0.16),rgb(0_168_255/0.04))] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
                          />
                          <motion.span
                            layoutId={reduce ? undefined : `sidebar-bar-${variant}`}
                            transition={SPRING}
                            className="absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan shadow-[0_0_10px_rgb(0_168_255/0.7)]"
                          />
                        </>
                      )}

                      <motion.span
                        className="relative flex"
                        animate={active && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                        transition={{ duration: 0.35, ease: EASE }}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] transition-[color,transform] duration-300",
                            active ? "text-cyan" : "text-subtle group-hover:translate-x-0.5 group-hover:text-fg/80",
                          )}
                          strokeWidth={active ? 2.1 : 1.8}
                        />
                      </motion.span>
                      <span className="relative truncate">{item.label}</span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}

        {variant === "client" && <DownloadCard onNavigate={onNavigate} reduce={reduce} delay={0.1 + order * 0.035} />}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <Dropdown
          align="start"
          width={236}
          items={menu}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue/40",
                open ? "bg-white/[0.05]" : "hover:bg-white/[0.04]",
              )}
            >
              <span className="relative shrink-0">
                <span className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00a8ff,#7c3aed)] text-[12px] font-bold text-white ring-2 ring-transparent transition-shadow duration-300 group-hover:ring-blue/25">
                  {initials(displayName)}
                </span>
                <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#10151f] bg-green" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{displayName}</span>
                <span className="block truncate text-[11.5px] text-muted">{user.roleLabel}</span>
              </span>
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }} className="flex">
                <ChevronsUpDown className="size-4 text-subtle transition-colors group-hover:text-fg/70" />
              </motion.span>
            </button>
          )}
        />
      </div>
    </div>
  );
}

function DownloadCard({ onNavigate, reduce, delay }: { onNavigate?: () => void; reduce: boolean; delay: number }) {
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : delay, duration: 0.45, ease: EASE }}
      className="mx-1 mt-2"
    >
      <Link
        href="/painel/download"
        onClick={onNavigate}
        className="group relative block overflow-hidden rounded-2xl border border-line bg-card p-4 transition-colors duration-300 outline-none hover:border-violet/30 focus-visible:ring-2 focus-visible:ring-blue/40"
      >
        {/* Brilho roxo que respira devagar */}
        <motion.div
          className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-purple/25 blur-2xl"
          animate={reduce ? undefined : { scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet/25 bg-violet/10 text-violet">
            <motion.span
              className="flex"
              animate={reduce ? undefined : { y: [0, 2.5, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
            >
              <Download className="size-4" />
            </motion.span>
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold">Baixe a extensão</p>
            <p className="text-[11.5px] text-muted">Disponível com licença válida</p>
          </div>
        </div>

        <p className="relative mt-3 text-[12px] leading-relaxed text-muted">Instale e use a agent direto dentro da Lovable.</p>

        <span className="relative mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-cyan">
          Ir para o download
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}