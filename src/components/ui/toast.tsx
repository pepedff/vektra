"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X, XCircle, type LucideIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import type { NotificationType } from "@/lib/supabase/types";

export type ToastType = NotificationType;

export interface ToastInput {
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastInput, "description">> {
  id: number;
  description?: string;
}

interface ToastApi {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const TOAST_STYLES: Record<
  ToastType,
  { icon: LucideIcon; glow: string; ring: string; iconBg: string; bar: string }
> = {
  success: {
    icon: Check,
    glow: "radial-gradient(120% 140% at 0% 0%, rgb(0 212 154 / 0.16), transparent 55%), radial-gradient(90% 120% at 100% 100%, rgb(0 213 255 / 0.08), transparent 60%)",
    ring: "linear-gradient(135deg, rgb(0 212 154 / 0.45), rgb(0 213 255 / 0.12) 40%, rgb(255 255 255 / 0.05))",
    iconBg: "bg-green/15 text-green ring-1 ring-green/30",
    bar: "from-green to-cyan",
  },
  error: {
    icon: XCircle,
    glow: "radial-gradient(120% 140% at 0% 0%, rgb(255 77 109 / 0.17), transparent 55%), radial-gradient(90% 120% at 100% 100%, rgb(236 72 153 / 0.08), transparent 60%)",
    ring: "linear-gradient(135deg, rgb(255 77 109 / 0.45), rgb(236 72 153 / 0.12) 40%, rgb(255 255 255 / 0.05))",
    iconBg: "bg-red/15 text-red ring-1 ring-red/30",
    bar: "from-red to-pink",
  },
  warning: {
    icon: AlertTriangle,
    glow: "radial-gradient(120% 140% at 0% 0%, rgb(255 176 32 / 0.16), transparent 55%), radial-gradient(90% 120% at 100% 100%, rgb(255 117 24 / 0.08), transparent 60%)",
    ring: "linear-gradient(135deg, rgb(255 176 32 / 0.45), rgb(255 117 24 / 0.12) 40%, rgb(255 255 255 / 0.05))",
    iconBg: "bg-yellow/15 text-yellow ring-1 ring-yellow/30",
    bar: "from-orange to-yellow",
  },
  info: {
    icon: Info,
    glow: "radial-gradient(120% 140% at 0% 0%, rgb(0 168 255 / 0.17), transparent 55%), radial-gradient(90% 120% at 100% 100%, rgb(124 58 237 / 0.1), transparent 60%)",
    ring: "linear-gradient(135deg, rgb(0 168 255 / 0.45), rgb(124 58 237 / 0.14) 40%, rgb(255 255 255 / 0.05))",
    iconBg: "bg-blue/15 text-blue ring-1 ring-blue/30",
    bar: "from-blue to-purple",
  },
};

export function ToastCard({
  type,
  title,
  description,
  onClose,
  duration,
  paused,
  className,
}: {
  type: ToastType;
  title: string;
  description?: string;
  onClose?: () => void;
  duration?: number;
  paused?: boolean;
  className?: string;
}) {
  const s = TOAST_STYLES[type];
  const Icon = s.icon;
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "ring-gradient relative w-full overflow-hidden rounded-[20px] bg-[#121824]/85 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.8),0_2px_8px_-2px_rgb(0_0_0/0.4)] backdrop-blur-xl",
        className,
      )}
      style={{ ["--ring" as string]: s.ring }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: s.glow }} />
      <div className="relative flex gap-3.5 p-4 pr-3">
        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", s.iconBg)}>
          <Icon className="size-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[14px] font-semibold leading-snug text-fg">{title}</p>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar notificação"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-white/[0.07] hover:text-fg"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {duration !== undefined && (
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.04]">
          <div
            className={cn("h-full origin-left bg-gradient-to-r opacity-80", s.bar)}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ToastEntry({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const t = window.setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(t);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, item.id, onDismiss]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto w-full"
    >
      <ToastCard
        type={item.type}
        title={item.title}
        description={item.description}
        duration={item.duration}
        paused={paused}
        onClose={() => onDismiss(item.id)}
      />
    </motion.li>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setItems((prev) =>
      [
        ...prev,
        { id, type: input.type ?? "info", title: input.title, description: input.description, duration: input.duration ?? 5000 },
      ].slice(-5),
    );
    return id;
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ol
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 left-4 z-[100] flex flex-col items-end gap-2.5 sm:left-auto sm:w-[380px]"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastEntry key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
