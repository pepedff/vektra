"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui/segmented";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { EmptyState } from "./panel";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  title?: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  loading?: boolean;
  search?: { placeholder: string; match: (row: T, query: string) => boolean };
  filter?: { options: { value: string; label: string }[]; match: (row: T, value: string) => boolean };
  rowActions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  pageSize?: number;
  emptyText?: string;
}

export function DataTable<T>({
  title,
  description,
  rows,
  columns,
  getKey,
  loading,
  search,
  filter,
  rowActions,
  toolbar,
  pageSize = 8,
  emptyText = "Nenhum registro encontrado.",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValue, setFilterValue] = useState(filter?.options[0]?.value ?? "");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) => (!q || !search || search.match(r, q)) && (!filter || !filterValue || filter.match(r, filterValue)),
    );
  }, [rows, query, filterValue, search, filter]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const [primary, ...rest] = columns;

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-card">
      <header className="flex flex-col gap-3 border-b border-line px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
          {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {filter && (
            <Segmented
              ariaLabel="Filtrar"
              value={filterValue}
              onChange={(v) => {
                setFilterValue(v);
                setPage(0);
              }}
              options={filter.options}
              className="overflow-x-auto"
            />
          )}
          {search && (
            <label className="group relative sm:w-60">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-cyan" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={search.placeholder}
                className="h-10 w-full rounded-xl border border-line bg-[#0e131c] pr-3 pl-9 text-[13px] outline-none transition-all placeholder:text-subtle focus:border-blue/50 focus:shadow-[0_0_0_4px_rgb(0_168_255/0.1)]"
              />
            </label>
          )}
          {toolbar}
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <TableSkeleton rows={Math.min(pageSize, 6)} cols={columns.length} />
          </motion.div>
        ) : visible.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState
              icon={<Inbox className="size-5" />}
              title={emptyText}
              text={query ? `Nada corresponde a "${query}". Tente outro termo.` : "Quando houver dados, eles aparecerão aqui."}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`data-${safePage}-${filterValue}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-line text-[11px] tracking-[0.1em] text-subtle uppercase">
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        className={cn("px-5 py-3 font-semibold whitespace-nowrap", c.align === "right" && "text-right")}
                      >
                        {c.header}
                      </th>
                    ))}
                    {rowActions && (
                      <th scope="col" className="w-14 px-5 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row, i) => (
                    <motion.tr
                      key={getKey(row)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="group border-b border-line/70 transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn("px-5 py-3.5 whitespace-nowrap", c.align === "right" && "text-right", c.className)}
                        >
                          {c.cell(row)}
                        </td>
                      ))}
                      {rowActions && <td className="px-3 py-2 text-right">{rowActions(row)}</td>}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {visible.map((row, i) => (
                <motion.li
                  key={getKey(row)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">{primary.cell(row)}</div>
                    {rowActions?.(row)}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {rest.map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="text-[10.5px] font-semibold tracking-[0.1em] text-subtle uppercase">{c.header}</dt>
                        <dd className="mt-1 truncate text-[13px]">{c.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && filtered.length > pageSize && (
        <footer className="flex items-center justify-between border-t border-line px-5 py-3 text-[12.5px] text-muted">
          <span className="tabular">
            {safePage * pageSize + 1}–{Math.min(filtered.length, (safePage + 1) * pageSize)} de {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="flex size-8 items-center justify-center rounded-lg border border-line transition-colors hover:bg-white/[0.05] disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Próxima página"
              disabled={safePage >= pages - 1}
              onClick={() => setPage(safePage + 1)}
              className="flex size-8 items-center justify-center rounded-lg border border-line transition-colors hover:bg-white/[0.05] disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
