"use client";

import { Handshake, KeyRound, Laptop, MonitorSmartphone, Plus, RefreshCw, Smartphone, Store, Trash2 } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { CopyButton, RowMenu } from "@/components/dashboard/row-menu";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { effectiveStatus } from "@/lib/billing/license";
import { formatBRL, formatDate, formatDateTime, initials } from "@/lib/format";
import type { Device, LicenseWithOwner, LoginEvent, Partner, Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { adminRevokeLicense, extendLicense } from "@/server/admin-actions";
import { AddLicenseModal, type CustomerOption } from "./add-license-modal";

export function AdminLicensesView({ licenses, customers, plans }: { licenses: LicenseWithOwner[]; customers: CustomerOption[]; plans: Plan[] }) {
  const { run } = useAction();
  const [open, setOpen] = useState(false);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  const columns: Column<LicenseWithOwner>[] = [
    {
      key: "key",
      header: "Chave",
      cell: (l) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12.5px]">{l.key}</span>
          <CopyButton value={l.key} label="Copiar chave" />
        </div>
      ),
    },
    {
      key: "owner",
      header: "Cliente",
      cell: (l) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{l.profiles?.full_name || l.profiles?.email || "—"}</p>
          {l.reseller_id && <p className="text-[11.5px] text-subtle">via revenda</p>}
        </div>
      ),
    },
    { key: "plan", header: "Plano", cell: (l) => <span className="text-muted">{planName(l.plan_id)}</span> },
    { key: "status", header: "Status", cell: (l) => <StatusBadge status={effectiveStatus(l)} /> },
    { key: "exp", header: "Validade", cell: (l) => <span className="text-muted">{formatDate(l.expires_at)}</span> },
  ];

  return (
    <>
      <PageHeader
        icon={KeyRound}
        title="Licenças"
        description="Todas as licenças emitidas."
        actions={
          <Button variant="action" icon={<Plus className="size-4" strokeWidth={2.4} />} onClick={() => setOpen(true)} disabled={customers.length === 0}>
            Adicionar licença
          </Button>
        }
      />
      <DataTable
        title="Licenças emitidas"
        rows={licenses}
        columns={columns}
        getKey={(l) => l.id}
        emptyText="Nenhuma licença emitida ainda."
        filter={{
          options: [
            { value: "todas", label: "Todas" },
            { value: "ativo", label: "Ativas" },
            { value: "teste", label: "Teste" },
            { value: "expirado", label: "Expiradas" },
            { value: "revogada", label: "Revogadas" },
          ],
          match: (l, v) => v === "todas" || effectiveStatus(l) === v,
        }}
        search={{
          placeholder: "Buscar chave ou cliente...",
          match: (l, q) => `${l.key} ${l.profiles?.full_name ?? ""} ${l.profiles?.email ?? ""}`.toLowerCase().includes(q),
        }}
        rowActions={(l) => (
          <RowMenu
            items={[
              {
                label: "Renovar 30 dias",
                icon: RefreshCw,
                onSelect: () => run(() => extendLicense(l.id, 30), { title: "Licença renovada", description: `${l.key} válida por mais 30 dias.` }),
              },
              ...(l.status === "revogada"
                ? []
                : [
                    {
                      label: "Revogar",
                      icon: Trash2,
                      danger: true,
                      separatorBefore: true,
                      onSelect: () => run(() => adminRevokeLicense(l.id), { type: "warning" as const, title: "Licença revogada", description: l.key }),
                    },
                  ]),
            ]}
          />
        )}
      />
      <AddLicenseModal open={open} onClose={() => setOpen(false)} customers={customers} plans={plans} />
    </>
  );
}

function describeAgent(ua: string | null): { device: string; mobile: boolean } {
  if (!ua) return { device: "Desconhecido", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Outro";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return { device: `${browser} · ${os}`, mobile };
}

export function AdminDevicesView({ devices }: { devices: Device[] }) {
  return (
    <>
      <PageHeader icon={MonitorSmartphone} title="Dispositivos" description="Onde a extensão está instalada." />
      <DataTable
        title="Instalações"
        rows={devices}
        columns={[
          { key: "u", header: "Cliente", cell: (d) => d.profiles?.full_name || d.profiles?.email || "—" },
          { key: "n", header: "Nome", cell: (d) => d.name || "Sem nome" },
          { key: "s", header: "Último acesso", cell: (d) => <span className="text-muted">{formatDateTime(d.last_seen_at)}</span> },
        ]}
        getKey={(d) => d.id}
        emptyText="Nenhum dispositivo registrado. A extensão passa a aparecer aqui quando se conectar."
      />
    </>
  );
}

export function SessionsView({ events }: { events: LoginEvent[] }) {
  const today = new Date().toDateString();
  const columns: Column<LoginEvent>[] = [
    {
      key: "user",
      header: "Usuário",
      cell: (s) => {
        const { device, mobile } = describeAgent(s.user_agent);
        return (
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted ring-1 ring-white/[0.06]">
              {mobile ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{s.profiles?.full_name || s.profiles?.email || "Conta excluída"}</p>
              <p className="text-[12px] text-subtle">{device}</p>
            </div>
          </div>
        );
      },
    },
    { key: "ip", header: "IP", cell: (s) => <span className="font-mono text-[12.5px] text-muted">{s.ip ?? "—"}</span> },
    { key: "seen", header: "Login em", cell: (s) => <span className="text-muted">{formatDateTime(s.created_at)}</span> },
  ];

  return (
    <>
      <PageHeader
        icon={MonitorSmartphone}
        title="Sessões"
        description={`Histórico de logins · ${events.filter((e) => new Date(e.created_at).toDateString() === today).length} hoje`}
      />
      <DataTable
        title="Logins recentes"
        rows={events}
        columns={columns}
        getKey={(s) => String(s.id)}
        emptyText="Nenhum login registrado ainda."
        search={{
          placeholder: "Buscar usuário ou IP...",
          match: (s, q) => `${s.profiles?.full_name ?? ""} ${s.profiles?.email ?? ""} ${s.ip ?? ""}`.toLowerCase().includes(q),
        }}
      />
    </>
  );
}

function PartnersTable({ kind, partners }: { kind: "afiliados" | "revendedores"; partners: Partner[] }) {
  const isAff = kind === "afiliados";
  const columns: Column<Partner>[] = [
    {
      key: "name",
      header: "Parceiro",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgb(124_58_237/0.3),rgb(236_72_153/0.25))] text-[12px] font-semibold">
            {initials(p.full_name || p.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{p.full_name || p.email}</p>
            <p className="font-mono text-[11.5px] text-subtle">{isAff ? p.referral_code : p.email}</p>
          </div>
        </div>
      ),
    },
    { key: "referrals", header: isAff ? "Indicados" : "Repassadas", cell: (p) => <span className="tabular">{p.referrals}</span> },
    { key: "sales", header: isAff ? "Vendas" : "Licenças compradas", cell: (p) => <span className="tabular">{p.sales}</span> },
    { key: "revenue", header: isAff ? "Receita gerada" : "Total pago", cell: (p) => <span className="text-muted tabular">{formatBRL(p.revenue_cents / 100)}</span> },
    ...(isAff
      ? [{ key: "commission", header: "Comissão (20%)", align: "right" as const, cell: (p: Partner) => <span className="font-semibold text-green tabular">{formatBRL(p.commission_cents / 100)}</span> }]
      : []),
  ];

  return (
    <>
      <PageHeader
        icon={isAff ? Handshake : Store}
        title={isAff ? "Afiliados" : "Revendedores"}
        description={
          isAff
            ? "Clientes que indicaram outros pelo link. Pedidos de saque aparecem em Logs."
            : "Contas com papel de revendedor. Promova um cliente em Clientes → Editar."
        }
      />
      <DataTable
        title={isAff ? "Ranking de afiliados" : "Revendedores"}
        rows={partners}
        columns={columns}
        getKey={(p) => p.id}
        emptyText={isAff ? "Ninguém indicou clientes ainda." : "Nenhum revendedor cadastrado."}
        search={{ placeholder: "Buscar parceiro...", match: (p, q) => `${p.full_name} ${p.email} ${p.referral_code}`.toLowerCase().includes(q) }}
      />
    </>
  );
}

export const AdminAffiliatesView = ({ partners }: { partners: Partner[] }) => <PartnersTable kind="afiliados" partners={partners} />;
export const ResellersView = ({ partners }: { partners: Partner[] }) => <PartnersTable kind="revendedores" partners={partners} />;
