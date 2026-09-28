"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pin, X } from "lucide-react";
import { TOAST_STYLES } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useNotifications } from "./provider";

export function PinnedBanners() {
  const { items, dismiss } = useNotifications();
  const pinned = items.filter((n) => n.pinned && !n.dismissed);

  return (
    <AnimatePresence initial={false}>
      {pinned.map((n) => {
        const s = TOAST_STYLES[n.type];
        const Icon = s.icon;
        return (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ring-gradient relative overflow-hidden rounded-[18px] bg-card" style={{ ["--ring" as string]: s.ring }}>
              <div className="pointer-events-none absolute inset-0" style={{ background: s.glow }} />
              <div className="relative flex items-start gap-3.5 p-4">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", s.iconBg)}>
                  <Icon className="size-4" strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[14px] font-semibold">
                    {n.title}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-muted">
                      <Pin className="size-3" /> Fixado
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{n.message}</p>
                </div>
                <button
                  type="button"
                  aria-label="Dispensar aviso"
                  onClick={() => dismiss(n.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-white/[0.07] hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
