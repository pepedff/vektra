import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-blue/10 text-cyan ring-1 ring-blue/25">
          <span className="absolute inset-0 rounded-full bg-blue/20 blur-md" />
          <Icon className="relative size-5" strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] md:text-[24px]">{title}</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
