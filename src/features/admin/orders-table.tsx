"use client";

import { Ban, CheckCircle2, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { RowMenu } from "@/components/dashboard/row-menu";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { DropdownItem } from "@/components/ui/dropdown";
import { formatCents, formatDateTime } from "@/lib/format";
import type { OrderWithCustomer, Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { confirmOrder, refundOrder, rejectOrder } from "@/server/admin-actions";

const cents = formatCents;

type Filter = { value: string; label: string };

const DEFAULT_FILTERS: Filter[] = [
  { value: "todos", label: "Todos" },
  { value: "aguardando", label: "Aguardando" },
  { value: "pendente", label: "Pendentes" },
  { value: "pago", label: "Pagos" },
  { value: "recusado", label: "Recusados" },
];

export function OrdersTable({
  title,
  description,
  orders,
  plans,
  filters = DEFAULT_FILTERS,
  dateField = "created_at",
  pageSize,
}: {
  title: string;
  description?: string;
  orders: OrderWithCustomer[];
  plans: Plan[];
  filters?: Filter[] | null;
  dateField?: "created_at" | "confirmed_at";
  pageSize?: number;
}) {
  const { run, pending } = useAction();
  const [rejecting, setRejecting] = useState<OrderWithCustomer | null>(null);
  const [refunding, setRefunding] = useState<OrderWithCustomer | null>(null);
  const [reason, setReason] = useState("");
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  const columns: Column<OrderWithCustomer>[] = [
    {
      key: "customer",
      header: "Pedido",
      cell: (o) => (
        <div>
          <p className="font-medium">{o.profiles?.full_name || o.profiles?.email || "Conta excluída"}</p>
          <p className="text-[12px] text-subtle">
            {o.pix_txid} · {o.quantity > 1 ? `${o.quantity}× ` : ""}
            {planName(o.plan_id)}
            {o.coupon_code ? ` · ${o.coupon_code}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: dateField === "confirmed_at" ? "Confirmado em" : "Criado em",
      cell: (o) => <span className="text-muted">{formatDateTime(o[dateField] ?? o.created_at)}</span>,
    },
    { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
    { key: "amount", header: "Valor", align: "right", cell: (o) => <span className="font-semibold tabular">{cents(o.amount_cents)}</span> },
  ];

  const actionsFor = (o: OrderWithCustomer): DropdownItem[] => {
    const items: DropdownItem[] = [];
    if (o.status === "pendente" || o.status === "aguardando") {
      items.push({
        label: "Confirmar pagamento",
        icon: CheckCircle2,
        onSelect: () =>
          run(() => confirmOrder(o.id), {
            title: "Pagamento confirmado",
            description: `Licença liberada para ${o.profiles?.full_name || o.profiles?.email}.`,
          }),
      });
      items.push({ label: "Recusar", icon: Ban, danger: true, onSelect: () => setRejecting(o) });
    }
    if (o.status === "pago") {
      items.push({ label: "Reembolsar", icon: RotateCcw, danger: true, onSelect: () => setRefunding(o) });
    }
    items.push({
      label: "Copiar identificador",
      icon: Copy,
      separatorBefore: items.length > 0,
      onSelect: () => void navigator.clipboard.writeText(o.pix_txid),
    });
    return items;
  };

  return (
    <>
      <DataTable
        title={title}
        description={description}
        rows={orders}
        columns={columns}
        getKey={(o) => o.id}
        pageSize={pageSize}
        emptyText="Nenhum pedido por aqui."
        filter={filters ? { options: filters, match: (o, v) => v === "todos" || o.status === v } : undefined}
        search={{
          placeholder: "Buscar cliente ou identificador...",
          match: (o, q) => `${o.pix_txid} ${o.profiles?.full_name ?? ""} ${o.profiles?.email ?? ""}`.toLowerCase().includes(q),
        }}
        rowActions={(o) => (
          <div className="flex items-center justify-end gap-1">
            {(o.status === "aguardando" || o.status === "pendente") && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                className="hidden px-2.5 text-green hover:bg-green/10 hover:text-green sm:inline-flex"
                onClick={() => run(() => confirmOrder(o.id), { title: "Pagamento confirmado", description: "Licença liberada." })}
              >
                <CheckCircle2 className="size-4" /> Confirmar
              </Button>
            )}
            <RowMenu items={actionsFor(o)} />
          </div>
        )}
      />

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Recusar pedido?"
        description="O cliente recebe uma notificação com o motivo."
        icon={<Ban className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!rejecting) return;
                run(() => rejectOrder(rejecting.id, reason), { type: "warning", title: "Pedido recusado" }, () => {
                  setRejecting(null);
                  setReason("");
                });
              }}
            >
              Recusar pedido
            </Button>
          </>
        }
      >
        <Field label="Motivo (opcional)" htmlFor="rj-reason">
          <Textarea
            id="rj-reason"
            rows={3}
            maxLength={300}
            placeholder="Ex.: Não localizamos o PIX no extrato."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={!!refunding}
        onClose={() => setRefunding(null)}
        title="Reembolsar pedido?"
        description="As licenças deste pedido são revogadas. Faça a devolução do PIX pelo seu banco."
        icon={<RotateCcw className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefunding(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!refunding) return;
                run(() => refundOrder(refunding.id), { type: "warning", title: "Pedido reembolsado" }, () => setRefunding(null));
              }}
            >
              Reembolsar {refunding ? cents(refunding.amount_cents) : ""}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          {refunding?.profiles?.full_name || refunding?.profiles?.email} · {refunding?.pix_txid}
        </p>
      </Modal>
    </>
  );
}
