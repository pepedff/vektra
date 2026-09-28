"use client";

import { motion } from "framer-motion";
import { CalendarClock, CircleCheck, CircleX, Eye, Gift, KeyRound, Layers, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { CopyButton, RowMenu } from "@/components/dashboard/row-menu";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { effectiveStatus } from "@/lib/billing/license";
import { formatDate } from "@/lib/format";
import type { License, Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { revokeMyLicense } from "@/server/client-actions";
import { CheckoutModal, type CheckoutTarget } from "./checkout-modal";

const DAY = 86_400_000;

function TrialCard({ trial, onUpgrade }: { trial: License | undefined; onUpgrade: () => void }) {
  const now = Date.now();
  const left = trial ? Math.ceil((new Date(trial.expires_at).getTime() - now) / DAY) : 0;
  const running = !!trial && left > 0 && trial.status !== "revogada";

  return (
    <div className="relative overflow-hidden rounded-panel border border-line bg-card p-5 md:p-6">
      <div className="pointer-events-none absolute -top-24 -left-10 size-64 rounded-full bg-purple/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-pink/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <motion.span
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 4 }}
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgb(124_58_237/0.25),rgb(236_72_153/0.2))] text-pink ring-1 ring-pink/25"
          >
            <Gift className="size-6" strokeWidth={1.9} />
          </motion.span>
          <div>
            <p className="text-[16px] font-semibold">Teste gratuito</p>
            <p className="mt-1 text-[13.5px] text-muted">
              {running ? (
                <>
                  Sua licença de teste vale por mais <span className="font-semibold text-fg tabular">{left}</span> {left === 1 ? "dia" : "dias"}.
                </>
              ) : trial ? (
                "Seu teste terminou. Assine um plano para continuar usando."
              ) : (
                "Contas novas ganham 3 dias de teste no plano Starter."
              )}
            </p>
            {running && (
              <div className="mt-3 flex gap-1.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${i < left ? "bg-pink/80" : "bg-white/[0.08]"}`} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="md:w-[240px]">
          <Button variant="action" className="h-12 w-full" icon={<Plus className="size-[18px]" strokeWidth={2.4} />} onClick={onUpgrade}>
            Assinar um plano
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LicensesView({ licenses, plans }: { licenses: License[]; plans: Plan[] }) {
  const { run, pending } = useAction();
  const [detail, setDetail] = useState<License | null>(null);
  const [revoke, setRevoke] = useState<License | null>(null);
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);

  const planOf = (id: string) => plans.find((p) => p.id === id);
  const status = (l: License) => effectiveStatus(l);
  const usable = licenses.filter((l) => ["ativo", "teste"].includes(status(l)));
  const expired = licenses.filter((l) => status(l) === "expirado");
  const nextExpiry = usable.map((l) => new Date(l.expires_at).getTime()).sort((a, b) => a - b)[0];
  const daysToExpiry = nextExpiry ? Math.max(0, Math.ceil((nextExpiry - Date.now()) / DAY)) : 0;
  const trial = licenses.find((l) => l.status === "teste");

  const buy = (planId?: string) => {
    const plan = (planId && planOf(planId)) || plans.find((p) => p.highlight) || plans[0];
    if (plan) setCheckout({ plan, quantity: 1 });
  };

  const columns: Column<License>[] = [
    {
      key: "key",
      header: "Licença",
      cell: (l) => (
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.04] text-muted ring-1 ring-white/[0.06]">
            <KeyRound className="size-4" />
          </span>
          <span className="font-mono text-[12.5px] text-fg/90">{l.key}</span>
          <CopyButton value={l.key} label="Copiar chave" />
        </div>
      ),
    },
    { key: "plan", header: "Plano", cell: (l) => <span className="text-fg/85">{planOf(l.plan_id)?.name ?? l.plan_id}</span> },
    { key: "status", header: "Status", cell: (l) => <StatusBadge status={status(l)} /> },
    { key: "expires", header: "Validade", cell: (l) => <span className="text-muted">{formatDate(l.expires_at)}</span> },
  ];

  return (
    <>
      <PageHeader
        icon={KeyRound}
        title="Licença"
        description="Chaves que autorizam o download e o uso da extensão."
        actions={
          <Button href="/painel/compras" variant="action" size="md" icon={<Plus className="size-4" strokeWidth={2.4} />}>
            Nova licença
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={licenses.length} icon={Layers} tone="blue" hint="licenças emitidas" />
        <StatCard label="Em uso" value={usable.length} icon={CircleCheck} tone="green" hint="ativas ou em teste" />
        <StatCard label="Expiradas" value={expired.length} icon={CircleX} tone="red" hint="compre de novo para reativar" />
        <StatCard label="Próximo vencimento" value={daysToExpiry} icon={CalendarClock} tone="purple" hint={nextExpiry ? "dias restantes" : "nenhuma ativa"} />
      </div>

      {(trial || licenses.length === 0) && (
        <div className="mt-4">
          <TrialCard trial={trial} onUpgrade={() => buy()} />
        </div>
      )}

      <div className="mt-6">
        <DataTable
          title="Suas licenças"
          description="Chaves vinculadas à sua conta."
          rows={licenses}
          columns={columns}
          getKey={(l) => l.id}
          pageSize={6}
          emptyText="Você ainda não tem licenças. Assine um plano em Compras."
          search={{ placeholder: "Buscar chave...", match: (l, q) => l.key.toLowerCase().includes(q) }}
          filter={{
            options: [
              { value: "todas", label: "Todas" },
              { value: "ativo", label: "Ativas" },
              { value: "teste", label: "Teste" },
              { value: "expirado", label: "Expiradas" },
            ],
            match: (l, v) => v === "todas" || status(l) === v,
          }}
          rowActions={(l) => (
            <RowMenu
              items={[
                { label: "Ver detalhes", icon: Eye, onSelect: () => setDetail(l) },
                { label: "Comprar novamente", icon: RefreshCw, onSelect: () => buy(l.plan_id) },
                ...(status(l) === "revogada"
                  ? []
                  : [{ label: "Revogar", icon: Trash2, danger: true, separatorBefore: true, onSelect: () => setRevoke(l) }]),
              ]}
            />
          )}
        />
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalhes da licença"
        description={detail?.key}
        icon={<KeyRound className="size-5" />}
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Fechar
          </Button>
        }
      >
        {detail && (
          <dl className="grid grid-cols-2 gap-4 text-[13.5px]">
            {[
              ["Plano", planOf(detail.plan_id)?.name ?? detail.plan_id],
              ["Status", <StatusBadge key="s" status={status(detail)} />],
              ["Criada em", formatDate(detail.created_at)],
              ["Validade", formatDate(detail.expires_at)],
              ["Origem", detail.status === "teste" ? "Teste gratuito" : detail.order_id ? "Compra via PIX" : "Emitida pela equipe"],
              ["Créditos", planOf(detail.plan_id)?.credits ?? "—"],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl border border-line bg-white/[0.02] p-3">
                <dt className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{k}</dt>
                <dd className="mt-1.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>

      <Modal
        open={!!revoke}
        onClose={() => setRevoke(null)}
        title="Revogar licença?"
        description="A chave deixa de funcionar imediatamente em todos os dispositivos. Esta ação não pode ser desfeita."
        icon={<Trash2 className="size-5" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevoke(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!revoke) return;
                const target = revoke;
                run(() => revokeMyLicense(target.id), { type: "warning", title: "Licença revogada", description: `${target.key} foi desativada.` }, () => setRevoke(null));
              }}
            >
              Revogar licença
            </Button>
          </>
        }
      >
        <p className="rounded-xl border border-red/20 bg-red/[0.06] px-4 py-3 font-mono text-[13px] text-fg/90">{revoke?.key}</p>
      </Modal>

      <CheckoutModal target={checkout} onClose={() => setCheckout(null)} />
    </>
  );
}
