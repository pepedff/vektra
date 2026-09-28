"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/use-mounted";

export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void; ref: (el: HTMLElement | null) => void }) => ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  width?: number;
}

export function Dropdown({ trigger, items, align = "end", width = 208 }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });
  const triggerEl = useRef<HTMLElement | null>(null);
  const menuEl = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  const place = useCallback(() => {
    const r = triggerEl.current?.getBoundingClientRect();
    if (!r) return;
    const estimatedHeight = items.length * 40 + 16;
    const up = r.bottom + estimatedHeight + 12 > window.innerHeight && r.top > estimatedHeight;
    const rawLeft = align === "end" ? r.right - width : r.left;
    setPos({
      top: up ? r.top - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8)),
      up,
    });
  }, [align, width, items.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuEl.current?.contains(t) && !triggerEl.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerEl.current?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const nodes = Array.from(menuEl.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        const idx = nodes.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (idx + 1) % nodes.length : (idx - 1 + nodes.length) % nodes.length;
        nodes[next]?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const setTriggerRef = useCallback((el: HTMLElement | null) => {
    triggerEl.current = el;
  }, []);

  return (
    <>
      {trigger({ open, toggle: () => setOpen((o) => !o), ref: setTriggerRef })}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuEl}
                role="menu"
                initial={{ opacity: 0, scale: 0.96, y: pos.up ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
                style={{
                  top: pos.top,
                  left: pos.left,
                  width,
                  translate: pos.up ? "0 -100%" : undefined,
                  transformOrigin: pos.up ? "bottom right" : "top right",
                }}
                className="fixed z-[95] rounded-2xl border border-line bg-[#141a26]/95 p-1.5 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.8)] backdrop-blur-xl"
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label}>
                      {item.separatorBefore && <div className="mx-2 my-1.5 h-px bg-line" />}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpen(false);
                          item.onSelect();
                        }}
                        className={cn(
                          "flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] font-medium outline-none transition-colors",
                          item.danger
                            ? "text-red hover:bg-red/10 focus-visible:bg-red/10"
                            : "text-fg/85 hover:bg-white/[0.06] hover:text-fg focus-visible:bg-white/[0.06]",
                        )}
                      >
                        {Icon && <Icon className={cn("size-4", item.danger ? "text-red" : "text-muted")} />}
                        {item.label}
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
