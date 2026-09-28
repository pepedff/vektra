"use client";

import { Package, Store, UserPlus } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { formatBRL, formatDateTime, initials } from "@/lib/format";
import type { LicenseWithOwner, Partner, Plan, ResellerPermissions, ResellerRequest } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { reviewResellerRequest, setResellerPermissions } from "@/server/extension-actions";
import { effectiveStatus } from "@/lib/billing/license";

const FLAGS: { key: keyof ResellerPermissions; label: string }[] = [
  { key: "create_customers", label: "Permitir criar clientes (licença por e-mail)" },
  { key: "create_licenses", label: "Permitir criar licenças" },
  { key: "renew_licenses", label: "Permitir renovar licenças" },
  { key: "suspend_licenses", label: "Permitir suspender licenças" },
  { key: "view_sales", label: "Permitir visualizar vendas" },
  { key: "own_brand", label: "Permitir usar marca própria" },
  { key: "customize", label: "Permitir personalização" },
  { key: "create_coupons", label: "Permitir criar cupons" },
];

const EMPTY_PERMS: Omit<ResellerPermissions, "user_id" | "created_at" | "branding_fields"> = {
  create_customers: true,
  create_licenses: true,
  renew_licenses: false,
  suspend_licenses: false,
  view_sales: true,
  own_brand: false,
  customize: false,
  create_coupons: false,
};

export function ResellersAdminView({
  partners,
  permissions,
}: {
  partners: Partner[];
  permissions: ResellerPermissions[];
}) {
  const { run, pending } = useAction();
  const [edit, setEdit] = useState<{ id: string; perms: ResellerPermissions } | null>(null);
  const byUser = new Map(permissions.map((p) => [p.user_id, p]));

  const columns: Column<Partner>[] = [
    {
      key: "name",
      header: "Revendedor",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgb(124_58_237/0.3),rgb(236_72_153/0.25))] text-[12px] font-semibold">
            {initials(p.full_name || p.email)}
          </span>
          <div>
            <p className="font-medium">{p.full_name || p.email}</p>
            <p className="text-[12px] text-subtle">{p.email}</p>
          </div>
        </div>
      ),
    },
    { key: "sales", header: "Licenças", cell: (p) => <span className="tabular">{p.sales}</span> },
    { key: "rev", header: "Pago", cell: (p) => <span className="text-muted tabular">{formatBRL(p.revenue_cents / 100)}</span> },
  ];

  return (
    <>
      <PageHeader icon={Store} title="Revendedores" description="Só quem você autorizar vê a área de revenda." />
      <DataTable
        title="Autorizados"
        rows={partners}
        columns={columns}
        getKey={(p) => p.id}
        emptyText="Nenhum revendedor ainda. Aprove um pedido em Solicitações."
        rowActions={(p) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setEdit({
                id: p.id,
                perms: byUser.get(p.id) ?? { ...EMPTY_PERMS, user_id: p.id, branding_fields: [], created_at: "" },
              })
            }
          >
            Permissões
          </Button>
        )}
      />
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Permissões"
        description="Escolha o que este revendedor pode fazer."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button
              variant="action"
              loading={pending}
              onClick={() => {
                if (!edit) return;
                run(() => setResellerPermissions(edit.id, edit.perms), { title: "Permissões atualizadas" }, () => setEdit(null));
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {edit &&
            FLAGS.map((f) => (
              <Switch
                key={f.key}
                label={f.label}
                checked={Boolean(edit.perms[f.key])}
                onChange={(v) => setEdit({ ...edit, perms: { ...edit.perms, [f.key]: v } })}
              />
            ))}
        </div>
      </Modal>
    </>
  );
}

export function RequestsView({ requests }: { requests: ResellerRequest[] }) {
  const { run, pending } = useAction();
  const pendingRows = requests.filter((r) => r.status === "pendente");

  return (
    <>
      <PageHeader icon={UserPlus} title="Solicitações" description="Pedidos de clientes que querem revender a extensão." />
      <DataTable
        title="Fila"
        rows={requests}
        columns={[
          { key: "u", header: "Cliente", cell: (r) => r.profiles?.full_name || r.profiles?.email || "—" },
          { key: "m", header: "Mensagem", cell: (r) => <span className="line-clamp-2 text-muted">{r.message}</span> },
          { key: "s", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "d", header: "Data", cell: (r) => <span className="text-muted">{formatDateTime(r.created_at)}</span> },
        ]}
        getKey={(r) => r.id}
        emptyText="Nenhuma solicitação."
        rowActions={(r) =>
          r.status === "pendente" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="action" disabled={pending} onClick={() => run(() => reviewResellerRequest(r.id, true, EMPTY_PERMS), { title: "Revenda liberada" })}>
                Aprovar
              </Button>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => reviewResellerRequest(r.id, false, {}), { title: "Pedido recusado" })}>
                Recusar
              </Button>
            </div>
          ) : null
        }
      />
      {pendingRows.length > 0 && <p className="mt-3 text-[12.5px] text-muted">{pendingRows.length} aguardando sua decisão.</p>}
    </>
  );
}

export function ResellerLicensesView({ licenses, plans }: { licenses: LicenseWithOwner[]; plans: Plan[] }) {
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;
  return (
    <>
      <PageHeader icon={Package} title="Licenças de revenda" description="Licenças com revendedor vinculado." />
      <DataTable
        title="Emitidas via revenda"
        rows={licenses}
        columns={[
          { key: "k", header: "Chave", cell: (l) => <span className="font-mono text-[12.5px]">{l.key}</span> },
          { key: "o", header: "Dono", cell: (l) => l.profiles?.email ?? "—" },
          { key: "e", header: "Reservada", cell: (l) => l.reserved_email ?? "—" },
          { key: "p", header: "Plano", cell: (l) => planName(l.plan_id) },
          { key: "s", header: "Status", cell: (l) => <StatusBadge status={effectiveStatus(l)} /> },
        ]}
        getKey={(l) => l.id}
        emptyText="Nenhuma licença de revenda ainda."
      />
    </>
  );
}
