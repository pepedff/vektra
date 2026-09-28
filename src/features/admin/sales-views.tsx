"use client";

import { BadgePercent, CreditCard, Hourglass, Pencil, Plus, Power, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { CopyButton, RowMenu } from "@/components/dashboard/row-menu";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { formatBRLCompact, formatCents as cents, formatDate } from "@/lib/format";
import type { Coupon, OrderWithCustomer, Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { deleteCoupon, saveCoupon, setCouponActive } from "@/server/admin-actions";
import { OrdersTable } from "./orders-table";

export function OrdersView({ orders, plans }: { orders: OrderWithCustomer[]; plans: Plan[] }) {
  const awaiting = orders.filter((o) => o.status === "aguardando");
  const pendingValue = awaiting.reduce((s, o) => s + o.amount_cents, 0);
  return (
    <>
      <PageHeader icon={ShoppingBag} title="Pedidos" description="Confirme os PIX recebidos para liberar as licenças." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Aguardando confirmação" value={awaiting.length} icon={Hourglass} tone="orange" hint="clientes avisaram que pagaram" />
        <StatCard label="Valor a conferir" value={pendingValue / 100} format={formatBRLCompact} icon={CreditCard} tone="blue" hint="no seu extrato" />
        <StatCard label="Pedidos" value={orders.length} icon={ShoppingBag} tone="purple" hint="no total" />
      </div>
      <OrdersTable title="Todos os pedidos" orders={orders} plans={plans} />
    </>
  );
}

export function AdminPaymentsView({ orders, plans }: { orders: OrderWithCustomer[]; plans: Plan[] }) {
  const received = orders.filter((o) => o.status === "pago" || o.status === "reembolsado");
  return (
    <>
      <PageHeader icon={CreditCard} title="Pagamentos" description="PIX confirmados manualmente." />
      <OrdersTable
        title="Pagamentos recebidos"
        orders={received}
        plans={plans}
        dateField="confirmed_at"
        filters={[
          { value: "todos", label: "Todos" },
          { value: "pago", label: "Pagos" },
          { value: "reembolsado", label: "Reembolsados" },
        ]}
      />
    </>
  );
}

type CouponDraft = { code: string; kind: "percent" | "amount"; value: string; maxUses: string; expiresAt: string };

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const EMPTY_DRAFT: CouponDraft = { code: "", kind: "percent", value: "10", maxUses: "100", expiresAt: inDays(30) };

function discountLabel(c: Coupon): string {
  return c.percent_off !== null ? `${c.percent_off}%` : cents(c.amount_off_cents ?? 0);
}

export function CouponsView({ coupons }: { coupons: Coupon[] }) {
  const { run, pending } = useAction();
  const [editing, setEditing] = useState<{ draft: CouponDraft; isNew: boolean } | null>(null);
  const [removing, setRemoving] = useState<Coupon | null>(null);

  const openEdit = (c: Coupon) =>
    setEditing({
      isNew: false,
      draft: {
        code: c.code,
        kind: c.percent_off !== null ? "percent" : "amount",
        value: String(c.percent_off ?? (c.amount_off_cents ?? 0) / 100),
        maxUses: String(c.max_uses),
        expiresAt: c.expires_at.slice(0, 10),
      },
    });

  const save = () => {
    if (!editing) return;
    const d = editing.draft;
    run(
      () =>
        saveCoupon(
          { code: d.code, kind: d.kind, value: Number(d.value), maxUses: Number(d.maxUses), expiresAt: d.expiresAt },
          editing.isNew,
        ),
      { title: editing.isNew ? "Cupom criado" : "Cupom atualizado", description: d.code.toUpperCase() },
      () => setEditing(null),
    );
  };

  const setDraft = (patch: Partial<CouponDraft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Cupom",
      cell: (c) => (
        <div className="flex items-center gap-1.5">
          <span className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-2.5 py-1 font-mono text-[12.5px] font-semibold">
            {c.code}
          </span>
          <CopyButton value={c.code} label="Copiar cupom" />
        </div>
      ),
    },
    { key: "discount", header: "Desconto", cell: (c) => <span className="font-semibold text-green">{discountLabel(c)}</span> },
    {
      key: "uses",
      header: "Uso",
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#7c3aed,#ec4899)]"
              style={{ width: `${Math.min(100, (c.uses / c.max_uses) * 100)}%` }}
            />
          </div>
          <span className="text-[12px] text-muted tabular">
            {c.uses}/{c.max_uses}
          </span>
        </div>
      ),
    },
    { key: "expires", header: "Validade", cell: (c) => <span className="text-muted">{formatDate(c.expires_at)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (c) => {
        const expired = new Date(c.expires_at).getTime() < Date.now();
        return (
          <Badge tone={c.active && !expired ? "green" : "neutral"}>{expired ? "expirado" : c.active ? "ativo" : "inativo"}</Badge>
        );
      },
    },
  ];

  const draft = editing?.draft;

  return (
    <>
      <PageHeader
        icon={BadgePercent}
        title="Cupons"
        description="Descontos aplicados no checkout. O servidor valida cada uso."
        actions={
          <Button variant="action" icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => setEditing({ draft: EMPTY_DRAFT, isNew: true })}>
            Novo cupom
          </Button>
        }
      />
      <DataTable
        title="Cupons cadastrados"
        rows={coupons}
        columns={columns}
        getKey={(c) => c.code}
        emptyText="Nenhum cupom criado ainda."
        rowActions={(c) => (
          <RowMenu
            items={[
              { label: "Editar", icon: Pencil, onSelect: () => openEdit(c) },
              {
                label: c.active ? "Desativar" : "Ativar",
                icon: Power,
                onSelect: () =>
                  run(() => setCouponActive(c.code, !c.active), {
                    type: c.active ? "warning" : "success",
                    title: c.active ? "Cupom desativado" : "Cupom ativado",
                    description: c.code,
                  }),
              },
              { label: "Excluir", icon: Trash2, danger: true, separatorBefore: true, onSelect: () => setRemoving(c) },
            ]}
          />
        )}
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.isNew ? "Novo cupom" : `Editar ${draft?.code ?? ""}`}
        icon={<BadgePercent className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button variant="action" onClick={save} disabled={pending}>
              {editing?.isNew ? "Criar cupom" : "Salvar"}
            </Button>
          </>
        }
      >
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label="Código" htmlFor="cp-code" hint="4 a 16 letras ou números. Ex.: NATAL25">
              <Input
                id="cp-code"
                value={draft.code}
                disabled={!editing?.isNew}
                maxLength={16}
                onChange={(e) => setDraft({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
              />
            </Field>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="Desconto" htmlFor="cp-disc">
                <Input id="cp-disc" type="number" min={1} step="0.01" value={draft.value} onChange={(e) => setDraft({ value: e.target.value })} />
              </Field>
              <Field label="Tipo" htmlFor="cp-type">
                <Select id="cp-type" value={draft.kind} onChange={(e) => setDraft({ kind: e.target.value as CouponDraft["kind"] })}>
                  <option value="percent">%</option>
                  <option value="amount">R$</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Limite de usos" htmlFor="cp-limit">
                <Input id="cp-limit" type="number" min={1} value={draft.maxUses} onChange={(e) => setDraft({ maxUses: e.target.value })} />
              </Field>
              <Field label="Válido até" htmlFor="cp-exp">
                <Input id="cp-exp" type="date" value={draft.expiresAt} onChange={(e) => setDraft({ expiresAt: e.target.value })} />
              </Field>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Excluir cupom?"
        description="Pedidos antigos que usaram o cupom continuam registrados."
        icon={<Trash2 className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => removing && run(() => deleteCoupon(removing.code), { type: "warning", title: "Cupom excluído", description: removing.code }, () => setRemoving(null))}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="font-mono text-[13px]">{removing?.code}</p>
      </Modal>
    </>
  );
}
