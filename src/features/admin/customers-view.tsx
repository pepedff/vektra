"use client";

import { Ban, Download, Eye, KeyRound, Link2, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { CopyButton, RowMenu } from "@/components/dashboard/row-menu";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { downloadCsv } from "@/lib/csv";
import { formatBRL, formatDate, initials } from "@/lib/format";
import type { AppRole, Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { deleteCustomer, setCustomerStatus, updateCustomer } from "@/server/admin-actions";
import type { CustomerRow } from "@/server/admin-queries";
import { AddLicenseModal } from "./add-license-modal";

type Dialog = { kind: "view" | "edit" | "license" | "suspend" | "delete"; customer: CustomerRow } | { kind: "invite" } | null;

const ROLE_LABEL: Record<AppRole, string> = { client: "Cliente", reseller: "Revendedor", admin: "Admin" };

function exportCustomers(rows: CustomerRow[], planName: (id: string | null) => string) {
  downloadCsv(
    "clientes",
    ["Nome", "E-mail", "Telefone", "Papel", "Status", "Plano", "Licenças ativas", "Total gasto (R$)", "Cadastro"],
    rows.map((c) => [
      c.full_name,
      c.email,
      c.phone ?? "",
      ROLE_LABEL[c.role],
      c.status,
      planName(c.plan_id),
      String(c.active_licenses),
      (c.spent_cents / 100).toFixed(2),
      c.created_at.slice(0, 10),
    ]),
  );
}

export function CustomersView({ customers, plans, currentUserId }: { customers: CustomerRow[]; plans: Plan[]; currentUserId: string }) {
  const { run, pending } = useAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draft, setDraft] = useState<{ name: string; role: AppRole }>({ name: "", role: "client" });
  const close = () => setDialog(null);
  const target = dialog && "customer" in dialog ? dialog.customer : null;
  const planName = (id: string | null) => (id ? (plans.find((p) => p.id === id)?.name ?? id) : "—");
  const inviteLink = typeof window === "undefined" ? "" : `${window.location.origin}/login?modo=criar`;

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Cliente",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgb(0_168_255/0.28),rgb(124_58_237/0.28))] text-[12px] font-semibold ring-1 ring-white/[0.08]">
            {initials(c.full_name || c.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {c.full_name || "Sem nome"}
              {c.role !== "client" && (
                <Badge tone={c.role === "admin" ? "purple" : "blue"} dot={false} className="ml-2 h-5 px-2 text-[10px]">
                  {ROLE_LABEL[c.role]}
                </Badge>
              )}
            </p>
            <p className="truncate text-[12px] text-subtle md:hidden">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "E-mail", cell: (c) => <span className="text-muted">{c.email}</span> },
    { key: "plan", header: "Plano", cell: (c) => <span className="text-fg/85">{planName(c.plan_id)}</span> },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status === "suspenso" ? "suspenso" : c.active_licenses > 0 ? "ativo" : "inativo"} /> },
    { key: "date", header: "Cadastro", cell: (c) => <span className="text-muted">{formatDate(c.created_at)}</span> },
    { key: "value", header: "Total gasto", align: "right", cell: (c) => <span className="font-semibold tabular">{formatBRL(c.spent_cents / 100)}</span> },
  ];

  const isSelf = (c: CustomerRow) => c.id === currentUserId;

  return (
    <>
      <PageHeader
        icon={Users}
        title="Clientes"
        description={`${customers.length} contas · ${customers.filter((c) => c.active_licenses > 0).length} com licença ativa`}
        actions={
          <>
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => exportCustomers(customers, planName)} disabled={customers.length === 0}>
              Exportar CSV
            </Button>
            <Button variant="action" icon={<UserPlus className="size-4" />} onClick={() => setDialog({ kind: "invite" })}>
              Convidar cliente
            </Button>
          </>
        }
      />

      <DataTable
        title="Base de clientes"
        rows={customers}
        columns={columns}
        getKey={(c) => c.id}
        emptyText="Nenhum cliente cadastrado ainda."
        search={{ placeholder: "Buscar nome ou e-mail...", match: (c, q) => `${c.full_name} ${c.email}`.toLowerCase().includes(q) }}
        filter={{
          options: [
            { value: "todos", label: "Todos" },
            { value: "ativo", label: "Com licença" },
            { value: "inativo", label: "Sem licença" },
            { value: "suspenso", label: "Suspensos" },
          ],
          match: (c, v) =>
            v === "todos" ||
            (v === "suspenso" ? c.status === "suspenso" : c.status === "ativo" && (v === "ativo" ? c.active_licenses > 0 : c.active_licenses === 0)),
        }}
        rowActions={(c) => (
          <RowMenu
            label={`Ações para ${c.full_name || c.email}`}
            items={[
              { label: "Visualizar", icon: Eye, onSelect: () => setDialog({ kind: "view", customer: c }) },
              {
                label: "Editar",
                icon: Pencil,
                onSelect: () => {
                  setDraft({ name: c.full_name, role: c.role });
                  setDialog({ kind: "edit", customer: c });
                },
              },
              { label: "Adicionar licença", icon: KeyRound, onSelect: () => setDialog({ kind: "license", customer: c }) },
              ...(isSelf(c)
                ? []
                : [
                    { label: c.status === "suspenso" ? "Reativar" : "Suspender", icon: Ban, separatorBefore: true, onSelect: () => setDialog({ kind: "suspend", customer: c }) },
                    ...(c.role === "admin" ? [] : [{ label: "Excluir", icon: Trash2, danger: true, onSelect: () => setDialog({ kind: "delete", customer: c }) }]),
                  ]),
            ]}
          />
        )}
      />

      <Modal
        open={dialog?.kind === "view"}
        onClose={close}
        title={target?.full_name || "Cliente"}
        description={target?.email}
        icon={<Eye className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Fechar
            </Button>
            <Button variant="action" onClick={() => target && setDialog({ kind: "license", customer: target })}>
              Adicionar licença
            </Button>
          </>
        }
      >
        {target && (
          <dl className="grid grid-cols-2 gap-3 text-[13.5px]">
            {[
              ["Plano", planName(target.plan_id)],
              ["Status", <StatusBadge key="s" status={target.status} />],
              ["Papel", ROLE_LABEL[target.role]],
              ["Cliente desde", formatDate(target.created_at)],
              ["Total gasto", formatBRL(target.spent_cents / 100)],
              ["Licenças ativas", String(target.active_licenses)],
              ["Telefone", target.phone || "—"],
              ["ID", target.id.slice(0, 8)],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl border border-line bg-white/[0.02] p-3">
                <dt className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{k}</dt>
                <dd className="mt-1.5 truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === "edit"}
        onClose={close}
        title="Editar cliente"
        description={target?.email}
        icon={<Pencil className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              variant="action"
              loading={pending}
              onClick={() => target && run(() => updateCustomer(target.id, draft.name, draft.role), { title: "Cliente atualizado", description: draft.name }, close)}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (target) run(() => updateCustomer(target.id, draft.name, draft.role), { title: "Cliente atualizado", description: draft.name }, close);
          }}
        >
          <Field label="Nome completo" htmlFor="ce-name">
            <Input id="ce-name" value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Papel" htmlFor="ce-role" hint="Revendedores compram pacotes com 30% off. Admins acessam este painel.">
            <Select id="ce-role" value={draft.role} disabled={target ? isSelf(target) : false} onChange={(e) => setDraft({ ...draft, role: e.target.value as AppRole })}>
              <option value="client">Cliente</option>
              <option value="reseller">Revendedor</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={dialog?.kind === "invite"}
        onClose={close}
        title="Convidar cliente"
        description="Envie este link. A pessoa cria a conta, ganha o teste de 3 dias e aparece aqui."
        icon={<Link2 className="size-5" />}
        footer={
          <Button variant="secondary" onClick={close}>
            Fechar
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-xl border border-line bg-[#0e131c] py-1.5 pr-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">{inviteLink}</span>
          <CopyButton value={inviteLink} label="Copiar link" />
        </div>
      </Modal>

      <AddLicenseModal
        open={dialog?.kind === "license"}
        onClose={close}
        customers={customers.map((c) => ({ id: c.id, name: c.full_name, email: c.email, plan_id: c.plan_id }))}
        plans={plans}
        customerId={target?.id}
      />

      <Modal
        open={dialog?.kind === "suspend"}
        onClose={close}
        title={target?.status === "suspenso" ? "Reativar cliente?" : "Suspender cliente?"}
        description={target?.status === "suspenso" ? "O cliente volta a acessar o painel." : "O cliente perde o acesso ao painel até ser reativado."}
        icon={<Ban className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              variant={target?.status === "suspenso" ? "action" : "danger"}
              loading={pending}
              onClick={() => {
                if (!target) return;
                const next = target.status === "suspenso" ? "ativo" : "suspenso";
                run(
                  () => setCustomerStatus(target.id, next),
                  { type: next === "suspenso" ? "warning" : "success", title: next === "suspenso" ? "Cliente suspenso" : "Cliente reativado", description: target.full_name || target.email },
                  close,
                );
              }}
            >
              {target?.status === "suspenso" ? "Reativar" : "Suspender"}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-muted">
          Cliente: <span className="font-medium text-fg">{target?.full_name || target?.email}</span>
        </p>
      </Modal>

      <Modal
        open={dialog?.kind === "delete"}
        onClose={close}
        title="Excluir cliente?"
        description="Remove a conta, as licenças e o histórico de pedidos. Esta ação não pode ser desfeita."
        icon={<Trash2 className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => target && run(() => deleteCustomer(target.id), { type: "error", title: "Cliente excluído", description: target.email }, close)}
            >
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <p className="rounded-xl border border-red/20 bg-red/[0.06] px-4 py-3 text-[13.5px]">
          {target?.full_name} · {target?.email}
        </p>
      </Modal>
    </>
  );
}
