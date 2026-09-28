"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ActionState = "idle" | "loading" | "success" | "error";

interface ActionButtonProps {
  state?: ActionState;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  className?: string;
  type?: "button" | "submit";
}

export function ActionButton({
  state = "idle",
  onClick,
  icon = <Lock className="size-[18px]" strokeWidth={2.2} />,
  children,
  loadingText = "Processando...",
  successText = "Concluído",
  errorText = "Tente novamente",
  className,
  type = "button",
}: ActionButtonProps) {
  const content: Record<ActionState, { icon: ReactNode; text: ReactNode }> = {
    idle: { icon, text: children },
    loading: { icon: <Loader2 className="size-[18px] animate-spin" />, text: loadingText },
    success: { icon: <Check className="size-[18px]" strokeWidth={2.6} />, text: successText },
    error: { icon, text: errorText },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={state === "loading"}
      aria-live="polite"
      className={cn(
        "group relative isolate flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl px-6 text-[15px] font-semibold text-white",
        "transition-[filter,transform,box-shadow,background] duration-300 ease-out-expo active:scale-[0.98]",
        "disabled:cursor-wait",
        state === "success"
          ? "bg-[linear-gradient(100deg,#00b386,#00d49a_55%,#2ee6c0)] shadow-[0_12px_30px_-14px_rgb(0_212_154/0.8)]"
          : state === "error"
            ? "bg-[linear-gradient(100deg,#e11d48,#ff4d6d)] shadow-[0_12px_30px_-14px_rgb(255_77_109/0.8)]"
            : "bg-action shadow-[0_12px_30px_-14px_rgb(0_168_255/0.85)] hover:brightness-[1.12] hover:shadow-[0_16px_36px_-14px_rgb(0_213_255/0.9)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgb(255_255_255/0.2),transparent_50%)]" />
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/15 blur-md transition-transform duration-700 ease-out-expo group-hover:translate-x-[300%]" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center gap-2.5"
        >
          {content[state].icon}
          {content[state].text}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
