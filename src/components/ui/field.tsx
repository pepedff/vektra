"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[12px] border bg-[#0e131c] px-3.5 text-[14px] text-fg placeholder:text-subtle outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-white/[0.14] focus:border-blue/60 focus:bg-[#0f1520] focus:shadow-[0_0_0_4px_rgb(0_168_255/0.12)] disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg/90">
        {label}
      </label>
      {children}
      {error ? (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[12px] text-red">
          {error}
        </motion.p>
      ) : (
        hint && <p className="text-[12px] text-subtle">{hint}</p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leading, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leading && (
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle">{leading}</span>
      )}
      <input
        ref={ref}
        {...rest}
        aria-invalid={invalid || undefined}
        className={cn(
          control,
          "h-11",
          leading && "pl-10",
          invalid ? "border-red/50 focus:border-red/70 focus:shadow-[0_0_0_4px_rgb(255_77_109/0.12)]" : "border-line",
          className,
        )}
      />
    </div>
  );
});

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn(control, "min-h-28 resize-y border-line py-3 leading-relaxed", className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={cn(control, "h-11 cursor-pointer appearance-none border-line pr-10", className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[14px] font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300",
          checked ? "border-blue/50 bg-blue/80" : "border-line-strong bg-white/[0.06]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className={cn(
            "absolute top-[3px] size-4 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.4)]",
            checked ? "right-[3px]" : "left-[3px]",
          )}
        />
      </button>
    </div>
  );
}
