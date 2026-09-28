import { Skeleton, StatSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export function PanelLoading({ stats = 4 }: { stats?: number }) {
  return (
    <div role="status" aria-label="Carregando">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-11 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: stats }, (_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
      <div className="mt-6 rounded-panel border border-line bg-card">
        <TableSkeleton rows={6} cols={5} />
      </div>
    </div>
  );
}
