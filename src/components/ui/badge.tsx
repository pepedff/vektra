import { cn } from "@/lib/cn";

export type Tone = "green" | "yellow" | "red" | "blue" | "purple" | "neutral";

const TONES: Record<Tone, string> = {
  green: "bg-green/10 text-green ring-green/25",
  yellow: "bg-yellow/10 text-yellow ring-yellow/25",
  red: "bg-red/10 text-red ring-red/25",
  blue: "bg-blue/10 text-cyan ring-blue/25",
  purple: "bg-purple/15 text-violet ring-purple/30",
  neutral: "bg-white/[0.05] text-muted ring-white/10",
};

const DOTS: Record<Tone, string> = {
  green: "bg-green",
  yellow: "bg-yellow",
  red: "bg-red",
  blue: "bg-cyan",
  purple: "bg-violet",
  neutral: "bg-muted",
};

export function Badge({
  tone = "neutral",
  children,
  dot = true,
  pulse = false,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", DOTS[tone], pulse && "animate-pulse-soft")} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ativo: "green",
  pago: "green",
  aprovado: "green",
  pendente: "yellow",
  aguardando: "yellow",
  expirado: "red",
  recusado: "red",
  revogada: "red",
  suspenso: "red",
  teste: "blue",
  reembolsado: "purple",
  inativo: "neutral",
  rascunho: "neutral",
  publicada: "green",
  arquivada: "purple",
  aprovada: "green",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Badge tone={tone} pulse={status === "aguardando"}>
      {status}
    </Badge>
  );
}
