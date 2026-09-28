import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-panel border border-line bg-card", className)}>
      {(title || actions) && (
        <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-white/[0.03] text-subtle">
        {icon}
      </span>
      <p className="mt-4 text-[14.5px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[320px] text-[13px] text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
