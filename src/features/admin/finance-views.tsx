"use client";

import { ArrowDownLeft, ArrowUpRight, LineChart, Receipt, RotateCcw, Ticket, Wallet } from "lucide-react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { cn } from "@/lib/cn";
import { formatBRLCompact, formatCents as cents, formatDateTime } from "@/lib/format";
import type { AdminMetrics, OrderWithCustomer, Plan, RevenuePoint } from "@/lib/supabase/types";
import { RevenueChartPanel } from "./dashboard-view";
import { OrdersTable } from "./orders-table";

export function RevenueView({ metrics: m, series }: { metrics: AdminMetrics; series: RevenuePoint[] }) {
  const delta = m.revenue_prev_30d_cents > 0 ? ((m.revenue_30d_cents - m.revenue_prev_30d_cents) / m.revenue_prev_30d_cents) * 100 : undefined;
  const ticket = m.paid_orders_30d > 0 ? m.revenue_30d_cents / m.paid_orders_30d : 0;
  return (
    <>
      <PageHeader icon={LineChart} title="Receita" description="Evolução dos pagamentos confirmados." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Últimos 30 dias" value={m.revenue_30d_cents / 100} format={formatBRLCompact} icon={Wallet} tone="blue" delta={delta} hint="vs. 30 dias anteriores" />
        <StatCard label="Receita total" value={m.revenue_total_cents / 100} format={formatBRLCompact} icon={ArrowUpRight} tone="purple" hint="desde o início" />
        <StatCard label="Ticket médio" value={ticket / 100} format={formatBRLCompact} icon={Ticket} tone="green" hint="30 dias" />
      </div>
      <div className="mt-4">
        <RevenueChartPanel initial={series} initialRange="ano" />
      </div>
    </>
  );
}

type Tx = { id: string; description: string; kind: "entrada" | "saída"; amount_cents: number; date: string };

function toTransactions(orders: OrderWithCustomer[]): Tx[] {
  const out: Tx[] = [];
  for (const o of orders) {
    const who = o.profiles?.full_name || o.profiles?.email || "Conta excluída";
    if ((o.status === "pago" || o.status === "reembolsado") && o.confirmed_at) {
      out.push({ id: `in-${o.id}`, description: `PIX ${o.pix_txid} — ${who}`, kind: "entrada", amount_cents: o.amount_cents, date: o.confirmed_at });
    }
    if (o.status === "reembolsado") {
      out.push({ id: `out-${o.id}`, description: `Reembolso ${o.pix_txid} — ${who}`, kind: "saída", amount_cents: o.amount_cents, date: o.confirmed_at ?? o.created_at });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function TransactionsView({ orders }: { orders: OrderWithCustomer[] }) {
  const rows = toTransactions(orders);
  const columns: Column<Tx>[] = [
    {
      key: "desc",
      header: "Transação",
      cell: (t) => (
        <div className="flex items-center gap-3">
          <span className={cn("flex size-8 items-center justify-center rounded-full", t.kind === "entrada" ? "bg-green/12 text-green" : "bg-red/12 text-red")}>
            {t.kind === "entrada" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
          </span>
          <span className="font-medium">{t.description}</span>
        </div>
      ),
    },
    { key: "kind", header: "Tipo", cell: (t) => <span className="text-muted capitalize">{t.kind}</span> },
    { key: "date", header: "Data", cell: (t) => <span className="text-muted">{formatDateTime(t.date)}</span> },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      cell: (t) => (
        <span className={cn("font-semibold tabular", t.kind === "entrada" ? "text-green" : "text-red")}>
          {t.kind === "entrada" ? "+" : "−"} {cents(t.amount_cents)}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader icon={Receipt} title="Transações" description="PIX confirmados e reembolsos." />
      <DataTable
        title="Extrato"
        rows={rows}
        columns={columns}
        getKey={(t) => t.id}
        emptyText="Nenhuma transação ainda."
        filter={{
          options: [
            { value: "todas", label: "Todas" },
            { value: "entrada", label: "Entradas" },
            { value: "saída", label: "Saídas" },
          ],
          match: (t, v) => v === "todas" || t.kind === v,
        }}
        search={{ placeholder: "Buscar transação...", match: (t, q) => t.description.toLowerCase().includes(q) }}
      />
    </>
  );
}

export function RefundsView({ orders, plans }: { orders: OrderWithCustomer[]; plans: Plan[] }) {
  return (
    <>
      <PageHeader
        icon={RotateCcw}
        title="Reembolsos"
        description="Para reembolsar, abra o pedido em Pagamentos. As licenças do pedido são revogadas."
      />
      <OrdersTable title="Pedidos reembolsados" orders={orders.filter((o) => o.status === "reembolsado")} plans={plans} filters={null} dateField="confirmed_at" />
    </>
  );
}
