"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { TOAST_STYLES } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { useNotifications } from "./provider";

export function NotificationBell() {
  const { variant, items, unread, clearUnread } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    clearUnread();
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, clearUnread]);

  return (
    <div ref={ref} className="relative">
      <IconButton label="Notificações" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="relative">
        <Bell className={cn("size-[18px]", unread > 0 && "origin-top animate-[bell_1.2s_ease-in-out_2]")} />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-pink ring-2 ring-bg" />}
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="absolute top-full right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-24px)] origin-top-right overflow-hidden rounded-2xl border border-line bg-[#131926]/95 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.85)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[13.5px] font-semibold">{variant === "admin" ? "Últimos envios" : "Notificações"}</p>
              <span className="text-[11.5px] text-subtle">{items.length} recentes</span>
            </div>
            <ul className="max-h-[360px] overflow-y-auto p-1.5">
              {items.length === 0 && (
                <li className="px-4 py-10 text-center text-[13px] text-muted">
                  Nada por aqui ainda.
                  <br />
                  <span className="text-subtle">
                    {variant === "admin" ? "Envie um aviso em Sistema → Notificações." : "Avisos da equipe aparecem aqui."}
                  </span>
                </li>
              )}
              {items.map((n) => {
                const s = TOAST_STYLES[n.type];
                const Icon = s.icon;
                return (
                  <li key={n.id} className="flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]">
                    <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", s.iconBg)}>
                      <Icon className="size-3.5" strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{n.title}</p>
                      <p className="line-clamp-2 text-[12px] leading-snug text-muted">{n.message}</p>
                      <p className="mt-1 text-[11px] text-subtle">{formatDateTime(n.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
