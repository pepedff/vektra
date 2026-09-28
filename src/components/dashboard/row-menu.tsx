"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

export function RowMenu({ items, label = "Ações" }: { items: DropdownItem[]; label?: string }) {
  return (
    <Dropdown
      items={items}
      trigger={({ toggle, ref, open }) => (
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg text-subtle transition-all duration-200 hover:bg-white/[0.07] hover:text-fg active:scale-90",
            open && "bg-white/[0.07] text-fg",
          )}
        >
          <MoreHorizontal className="size-[18px]" />
        </button>
      )}
    />
  );
}

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("[clipboard] copy failed", error);
      toast({ type: "error", title: "Não foi possível copiar", description: "Seu navegador bloqueou o acesso à área de transferência." });
    }
  };

  return (
    <Tooltip content={copied ? "Copiado!" : label}>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="inline-flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-white/[0.07] hover:text-fg"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "ok" : "copy"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {copied ? <Check className="size-3.5 text-green" strokeWidth={2.8} /> : <Copy className="size-3.5" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}
