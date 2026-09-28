import { cn } from "@/lib/cn";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-white/[0.045]", className)} style={style} aria-hidden>
      <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.05),transparent)]" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-7 w-24" />
      <Skeleton className="mt-3 h-2.5 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-40 max-w-full" />
            <Skeleton className="h-2.5 w-28 max-w-full" />
          </div>
          {Array.from({ length: cols - 2 }, (_, c) => (
            <Skeleton key={c} className="hidden h-3 w-20 md:block" />
          ))}
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
