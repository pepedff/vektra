"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/use-mounted";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, icon, children, footer, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])")?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[#05070b]/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={cn(
              "relative w-full max-w-[480px] overflow-hidden rounded-[20px] border border-line bg-[#121823] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.85)]",
              className,
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(60%_100%_at_20%_0%,rgb(0_168_255/0.1),transparent)]" />
            <div className="relative flex items-start gap-3.5 px-6 pt-6">
              {icon && (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue/12 text-cyan ring-1 ring-blue/25">
                  {icon}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold tracking-tight text-fg">{title}</h2>
                {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
              </div>
              <button
                type="button"
                data-close
                onClick={onClose}
                aria-label="Fechar"
                className="-mt-1 -mr-2 flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative px-6 pt-5 pb-6">{children}</div>
            {footer && (
              <div className="relative flex flex-col-reverse gap-2.5 border-t border-line bg-white/[0.015] px-6 py-4 sm:flex-row sm:justify-end">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
