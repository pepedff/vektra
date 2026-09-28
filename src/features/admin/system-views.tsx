"use client";

import { AlertTriangle, Info, ScrollText, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge, type Tone } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { AuditLog, LogLevel } from "@/lib/supabase/types";

const LEVEL: Record<LogLevel, { tone: Tone; icon: typeof Info; cls: string }> = {
  info: { tone: "blue", icon: Info, cls: "text-blue" },
  warn: { tone: "yellow", icon: AlertTriangle, cls: "text-yellow" },
  error: { tone: "red", icon: XCircle, cls: "text-red" },
};

export function LogsView({ logs }: { logs: AuditLog[] }) {
  const columns: Column<AuditLog>[] = [
    {
      key: "event",
      header: "Evento",
      cell: (l) => {
        const Icon = LEVEL[l.level].icon;
        return (
          <div className="flex items-center gap-2.5">
            <Icon className={cn("size-4 shrink-0", LEVEL[l.level].cls)} />
            <span className="whitespace-normal">{l.event}</span>
          </div>
        );
      },
    },
    { key: "level", header: "Nível", cell: (l) => <Badge tone={LEVEL[l.level].tone}>{l.level}</Badge> },
    { key: "actor", header: "Autor", cell: (l) => <span className="text-[12.5px] text-muted">{l.profiles?.full_name || l.profiles?.email || "Sistema"}</span> },
    { key: "at", header: "Quando", cell: (l) => <span className="text-muted tabular">{formatDateTime(l.created_at)}</span> },
  ];
  return (
    <>
      <PageHeader icon={ScrollText} title="Logs" description="Auditoria: pedidos, confirmações, licenças, clientes e saques." />
      <DataTable
        title="Eventos"
        rows={logs}
        columns={columns}
        getKey={(l) => String(l.id)}
        pageSize={10}
        emptyText="Nenhum evento registrado ainda."
        filter={{
          options: [
            { value: "todos", label: "Todos" },
            { value: "info", label: "Info" },
            { value: "warn", label: "Avisos" },
            { value: "error", label: "Críticos" },
          ],
          match: (l, v) => v === "todos" || l.level === v,
        }}
        search={{
          placeholder: "Buscar evento...",
          match: (l, q) => `${l.event} ${l.profiles?.full_name ?? ""} ${l.profiles?.email ?? ""}`.toLowerCase().includes(q),
        }}
      />
    </>
  );
}
