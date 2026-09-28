"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "action" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-flow text-white shadow-[0_10px_30px_-12px_rgb(236_72_153/0.55),0_4px_18px_-10px_rgb(0_168_255/0.5)] hover:-translate-y-0.5 hover:shadow-[0_16px_38px_-14px_rgb(236_72_153/0.6),0_8px_24px_-12px_rgb(0_168_255/0.55)] before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(180deg,rgb(255_255_255/0.22),transparent_55%)] before:opacity-70",
  action:
    "bg-action text-white shadow-[0_10px_28px_-14px_rgb(0_168_255/0.8)] hover:brightness-110 before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(180deg,rgb(255_255_255/0.22),transparent_55%)]",
  secondary:
    "border border-line-strong bg-white/[0.02] text-fg hover:border-white/20 hover:bg-white/[0.05]",
  ghost: "text-muted hover:bg-white/[0.05] hover:text-fg",
  danger:
    "bg-red/12 text-red border border-red/25 hover:bg-red/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-[14px]",
  lg: "h-14 px-7 text-[15px] gap-2.5 rounded-2xl",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps & { href: string; onClick?: () => void };

function classes(variant: Variant, size: Size, className?: string): string {
  return cn(
    "group relative isolate inline-flex select-none items-center justify-center overflow-hidden font-semibold whitespace-nowrap",
    "transition-[transform,box-shadow,background-color,border-color,color,filter] duration-300 ease-out-expo",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

function Inner({ loading, icon, trailingIcon, children }: CommonProps) {
  return (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      <span className="relative">{children}</span>
      {trailingIcon && (
        <span className="relative transition-transform duration-300 ease-out-expo group-hover:translate-x-1">
          {trailingIcon}
        </span>
      )}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps | LinkProps>(function Button(props, ref) {
  const { variant = "secondary", size = "md", className, loading, icon, trailingIcon, children } = props;
  const cls = classes(variant, size, className);

  if (props.href !== undefined) {
    return (
      <Link href={props.href} onClick={props.onClick} className={cls}>
        <Inner loading={loading} icon={icon} trailingIcon={trailingIcon}>
          {children}
        </Inner>
      </Link>
    );
  }

  const { variant: _v, size: _s, loading: _l, icon: _i, trailingIcon: _t, className: _c, ...rest } =
    props as ButtonProps;
  return (
    <button ref={ref} type="button" {...rest} disabled={rest.disabled || loading} className={cls}>
      <Inner loading={loading} icon={icon} trailingIcon={trailingIcon}>
        {children}
      </Inner>
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...rest}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl text-muted transition-colors duration-200 hover:bg-white/[0.06] hover:text-fg active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  );
}
