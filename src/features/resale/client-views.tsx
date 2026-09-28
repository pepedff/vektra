"use client";

import { Gauge, KeyRound, ShoppingBag, SlidersHorizontal, Users } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { DEFAULT_BRANDING, mergeBranding, pickAllowed, type Branding } from "@/lib/extension/branding";
import { effectiveStatus } from "@/lib/billing/license";
import { formatDate } from "@/lib/format";
import type { License, Plan, ResellerPermissions } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { createReservedLicense, saveMyBranding } from "@/server/extension-actions";
import { CheckoutModal, type CheckoutTarget } from "@/features/client/checkout-modal";

function stockSplit(available: License[]) {
  return {
    waiting: available.filter((l) => l.reserved_email),
    free: available.filter((l) => !l.reserved_email),
  };
}

export function ResellerDashboard({ available, transferred }: { available: License[]; transferred: License[] }) {
  const { waiting, free } = stockSplit(available);
  return (
    <>
      <PageHeader icon={Gauge} title="Revenda" description="Área limitada ao que o administrador liberou." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Em estoque" value={free.length} icon={KeyRound} tone="cyan" hint="sem reserva" />
        <StatCard label="Reservadas" value={waiting.length} icon={Users} tone="blue" hint="aguardando cadastro" />
        <StatCard label="Clientes" value={transferred.length} icon={Users} tone="green" hint="já vinculadas" />
      </div>
    </>
  );
}

export function ResellerClientsView({ transferred }: { transferred: License[] }) {
  return (
    <>
      <PageHeader icon={Users} title="Clientes" description="Licenças que já estão na conta do cliente." />
      <DataTable
        title="Carteira"
        rows={transferred}
        columns={[
          { key: "k", header: "Licença", cell: (l) => <span className="font-mono text-[12.5px]">{l.key}</span> },
          { key: "s", header: "Status", cell: (l) => <StatusBadge status={effectiveStatus(l)} /> },
          { key: "e", header: "Validade", cell: (l) => formatDate(l.expires_at) },
        ]}
        getKey={(l) => l.id}
        emptyText="Nenhum cliente vinculado ainda."
      />
    </>
  );
}

export function ResellerLicensesClientView({
  available,
  plans,
  canCreate,
}: {
  available: License[];
  plans: Plan[];
  canCreate: boolean;
}) {
  const { run, pending } = useAction();
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [days, setDays] = useState(30);

  return (
    <>
      <PageHeader icon={KeyRound} title="Licenças" description="Reserve uma chave para o e-mail do cliente. No cadastro dela, a licença passa automaticamente." />
      {canCreate && (
        <Panel title="Reservar para um e-mail" bodyClassName="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="E-mail do cliente" htmlFor="re">
            <Input id="re" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Plano" htmlFor="rp">
            <Select id="rp" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dias" htmlFor="rd">
            <Input id="rd" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </Field>
          <div className="sm:col-span-3">
            <Button
              variant="action"
              loading={pending}
              disabled={!email || !planId}
              onClick={() => run(() => createReservedLicense({ email, planId, days }), { title: "Licença reservada" }, () => setEmail(""))}
            >
              Reservar licença
            </Button>
          </div>
        </Panel>
      )}
      <div className="mt-4">
        <DataTable
          title="Estoque"
          rows={available}
          columns={[
            { key: "k", header: "Chave", cell: (l) => <span className="font-mono text-[12.5px]">{l.key}</span> },
            { key: "r", header: "Reservada para", cell: (l) => l.reserved_email ?? "—" },
            { key: "s", header: "Status", cell: (l) => <StatusBadge status={effectiveStatus(l)} /> },
          ]}
          getKey={(l) => l.id}
          emptyText="Sem licenças em estoque. Compre um pacote em Vendas."
        />
      </div>
    </>
  );
}

export function ResellerSalesView({ plans }: { plans: Plan[] }) {
  const [pack, setPack] = useState("10");
  const [planId, setPlanId] = useState(plans.find((p) => p.highlight)?.id ?? plans[0]?.id ?? "");
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);
  const plan = plans.find((p) => p.id === planId);

  return (
    <>
      <PageHeader icon={ShoppingBag} title="Vendas" description="Pacotes da extensão com 30% de desconto por licença." />
      <Panel bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Plano" htmlFor="sp">
          <Select id="sp" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantidade" htmlFor="sq">
          <Select id="sq" value={pack} onChange={(e) => setPack(e.target.value)}>
            {[2, 5, 10, 25, 50].map((n) => (
              <option key={n} value={String(n)}>
                {n} licenças
              </option>
            ))}
          </Select>
        </Field>
        <Button
          variant="action"
          disabled={!plan}
          onClick={() => plan && setCheckout({ plan, quantity: Number(pack) })}
        >
          Continuar para o PIX
        </Button>
      </Panel>
      <CheckoutModal target={checkout} onClose={() => setCheckout(null)} />
    </>
  );
}

export function ResellerConfigView({
  permissions,
  branding,
}: {
  permissions: ResellerPermissions;
  branding: Partial<Branding>;
}) {
  const { run, pending } = useAction();
  const allowed = permissions.branding_fields.length ? permissions.branding_fields : permissions.own_brand ? ["extensionName", "assistantName", "colorPrimary", "messages"] : [];
  const [draft, setDraft] = useState<Branding>(() => mergeBranding(DEFAULT_BRANDING, branding));

  if (!permissions.own_brand && !permissions.customize) {
    return (
      <>
        <PageHeader icon={SlidersHorizontal} title="Configurações" description="O administrador ainda não liberou marca própria nesta conta." />
        <Panel bodyClassName="p-5 text-[13.5px] text-muted">Seus clientes recebem a identidade padrão da extensão.</Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader icon={SlidersHorizontal} title="Configurações" description="Só os campos liberados pelo admin. Nada interno da IA." />
      <Panel bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
        {allowed.includes("extensionName") && (
          <Field label="Nome" htmlFor="rn">
            <Input id="rn" value={draft.extensionName} onChange={(e) => setDraft({ ...draft, extensionName: e.target.value })} />
          </Field>
        )}
        {allowed.includes("assistantName") && (
          <Field label="Assistente" htmlFor="ra">
            <Input id="ra" value={draft.assistantName} onChange={(e) => setDraft({ ...draft, assistantName: e.target.value })} />
          </Field>
        )}
        {allowed.includes("colorPrimary") && (
          <Field label="Cor principal" htmlFor="rc">
            <Input id="rc" value={draft.colorPrimary} onChange={(e) => setDraft({ ...draft, colorPrimary: e.target.value })} />
          </Field>
        )}
        {allowed.includes("messages") && (
          <Field label="Mensagem inicial" htmlFor="rm" className="sm:col-span-2">
            <Input id="rm" value={draft.messages} onChange={(e) => setDraft({ ...draft, messages: e.target.value })} />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Button variant="action" loading={pending} onClick={() => run(() => saveMyBranding(pickAllowed(draft, allowed)), { title: "Marca salva" })}>
            Salvar
          </Button>
        </div>
      </Panel>
    </>
  );
}
