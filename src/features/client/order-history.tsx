"use client";

import { Download, QrCode, Receipt } from "lucide-react";
import { useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { CopyButton, RowMenu } from "@/components/dashboard/row-menu";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/csv";
import { formatCents, formatDateTime } from "@/lib/format";
import type { Order, OrderStatus, Plan } from "@/lib/supabase/types";
import { getOrderCharge } from "@/server/order-actions";
import { CheckoutModal, type CheckoutTarget } from "./checkout-modal";

const cents = formatCents;

const STATUS_LABEL: Record<OrderStatus, string> = {
  pendente: "Aguardando PIX",
  aguardando: "Em conferência",
  pago: "Pago",
  recusado: "Recusado",
  reembolsado: "Reembolsado",
  expirado: "Expirado",
};

export function exportOrders(orders: Order[], planName: (id: string) => string): void {
  downloadCsv(
    "pagamentos",
    ["Pedido (txid)", "Plano", "Qtd.", "Desconto (R$)", "Total (R$)", "Status", "Criado em", "Confirmado em"],
    orders.map((o) => [
      o.pix_txid,
      planName(o.plan_id),
      String(o.quantity),
      (o.discount_cents / 100).toFixed(2),
      (o.amount_cents / 100).toFixed(2),
      STATUS_LABEL[o.status],
      o.created_at.slice(0, 16).replace("T", " "),
      o.confirmed_at ? o.confirmed_at.slice(0, 16).replace("T", " ") : "",
    ]),
  );
}

export function MyOrdersTable({
  title,
  description,
  orders,
  plans,
  pageSize = 8,
  withFilters = true,
}: {
  title: string;
  description?: string;
  orders: Order[];
  plans: Plan[];
  pageSize?: number;
  withFilters?: boolean;
}) {
  const { toast } = useToast();
  const [target, setTarget] = useState<CheckoutTarget | null>(null);
  const [opening, startOpening] = useTransition();
  const planOf = (id: string) => plans.find((p) => p.id === id);

  const reopen = (order: Order) =>
    startOpening(async () => {
      const plan = planOf(order.plan_id);
      if (!plan) return;
      const res = await getOrderCharge(order.id);
      if (!res.ok) {
        toast({ type: "error", title: "Não foi possível abrir o PIX", description: res.error });
        return;
      }
      setTarget({ plan, quantity: order.quantity, charge: res.data });
    });

  const columns: Column<Order>[] = [
    {
      key: "desc",
      header: "Compra",
      cell: (o) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted ring-1 ring-white/[0.06]">
            <Receipt className="size-4" />
          </span>
          <div>
            <p className="font-medium">
              {planOf(o.plan_id)?.name ?? o.plan_id}
              {o.quantity > 1 && <span className="text-muted"> × {o.quantity}</span>}
            </p>
            <p className="flex items-center gap-1 font-mono text-[11.5px] text-subtle">
              {o.pix_txid}
              <CopyButton value={o.pix_txid} label="Copiar identificador" />
            </p>
          </div>
        </div>
      ),
    },
    { key: "date", header: "Data", cell: (o) => <span className="text-muted">{formatDateTime(o.created_at)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (o) => (
        <div>
          <StatusBadge status={o.status} />
          {o.status === "recusado" && o.reject_reason && <p className="mt-1 max-w-[220px] truncate text-[11.5px] text-subtle">{o.reject_reason}</p>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      cell: (o) => (
        <div>
          <p className="font-semibold tabular">{cents(o.amount_cents)}</p>
          {o.discount_cents > 0 && <p className="text-[11.5px] text-green tabular">−{cents(o.discount_cents)}</p>}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title={title}
        description={description}
        rows={orders}
        columns={columns}
        getKey={(o) => o.id}
        pageSize={pageSize}
        emptyText="Nenhuma compra ainda. Seus pedidos e cobranças PIX aparecem aqui."
        search={withFilters ? { placeholder: "Buscar pedido...", match: (o, q) => `${o.pix_txid} ${planOf(o.plan_id)?.name ?? ""}`.toLowerCase().includes(q) } : undefined}
        filter={
          withFilters
            ? {
                options: [
                  { value: "todos", label: "Todos" },
                  { value: "pendente", label: "Aguardando PIX" },
                  { value: "aguardando", label: "Em conferência" },
                  { value: "pago", label: "Pagos" },
                  { value: "recusado", label: "Recusados" },
                ],
                match: (o, v) => v === "todos" || o.status === v,
              }
            : undefined
        }
        rowActions={(o) =>
          o.status === "pendente" ? (
            <Button size="sm" variant="action" icon={<QrCode className="size-3.5" />} disabled={opening} onClick={() => reopen(o)}>
              Pagar
            </Button>
          ) : (
            <RowMenu
              items={[
                {
                  label: "Exportar esta cobrança",
                  icon: Download,
                  onSelect: () => exportOrders([o], (id) => planOf(id)?.name ?? id),
                },
              ]}
            />
          )
        }
      />
      <CheckoutModal target={target} onClose={() => setTarget(null)} />
    </>
  );
}
