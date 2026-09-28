import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D5FF" />
          <stop offset="0.5" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#151B26" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" stroke={`url(#${id}-g)`} strokeOpacity="0.55" fill="none" />
      <path d="M8.5 9.5 L16 23 L23.5 9.5" stroke={`url(#${id}-g)`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="16" cy="9.6" r="1.9" fill="#00D5FF" />
    </svg>
  );
}

export function Logo({ href = "/", subtitle, className }: { href?: string; subtitle?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:rotate-[-8deg] group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className="text-[16px] font-bold tracking-tight text-fg">Vektra</span>
        {subtitle && <span className="mt-1 text-[11.5px] font-medium text-muted">{subtitle}</span>}
      </span>
    </Link>
  );
}
