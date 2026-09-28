"use client";

import { Download, KeyRound, MonitorSmartphone, Puzzle, RefreshCw, Timer } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, Panel } from "@/components/dashboard/panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { effectiveStatus } from "@/lib/billing/license";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Device, ExtensionVersion, License, Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { requestDownload } from "@/server/extension-actions";

export function OverviewView({
  licenses,
  latest,
}: {
  licenses: License[];
  latest: ExtensionVersion | null;
}) {
  const usable = licenses.filter((l) => ["ativo", "teste"].includes(effectiveStatus(l)));
  const best = usable[0];

  return (
    <>
      <PageHeader icon={Puzzle} title="Extensão" description="Um produto: a extensão. A agent funciona dentro dela, na Lovable." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Licenças ativas" value={usable.length} icon={KeyRound} tone="green" hint={best ? `até ${formatDate(best.expires_at)}` : "nenhuma ativa"} />
        <StatCard label="Versão publicada" value={latest ? 1 : 0} icon={RefreshCw} tone="blue" hint={latest ? `${latest.version} · ${latest.name}` : "nenhuma ainda"} />
        <StatCard
          label="Dias restantes"
          value={best ? Math.max(0, Math.ceil((new Date(best.expires_at).getTime() - Date.now()) / 86_400_000)) : 0}
          icon={Timer}
          tone="purple"
          hint={best ? "da licença em uso" : "assine um plano"}
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Como usar" bodyClassName="space-y-2 p-5 text-[13.5px] leading-relaxed text-muted">
          <p>1. Compre ou ative uma licença.</p>
          <p>2. Baixe o arquivo oficial em Download.</p>
          <p>3. Instale a extensão no navegador.</p>
          <p>4. Abra a Lovable — a extensão carrega a nossa interface, com a agent embutida.</p>
        </Panel>
        <Panel title="Próximo passo" bodyClassName="p-5">
          {usable.length === 0 ? (
            <Button href="/painel/compras" variant="action">
              Assinar um plano
            </Button>
          ) : (
            <Button href="/painel/download" variant="action" icon={<Download className="size-4" />}>
              Baixar extensão
            </Button>
          )}
        </Panel>
      </div>
    </>
  );
}

export function DownloadView({ licensed, latest }: { licensed: boolean; latest: ExtensionVersion | null }) {
  const { run, pending } = useAction();

  return (
    <>
      <PageHeader icon={Download} title="Download" description="O arquivo só é liberado com licença válida, por um link temporário." />
      {!licensed ? (
        <Panel bodyClassName="p-6">
          <EmptyState icon={<KeyRound className="size-5" />} title="Licença necessária" text="Assine um plano para autorizar o download da extensão." />
          <div className="px-5 pb-5">
            <Button href="/painel/compras" variant="action">
              Ver planos
            </Button>
          </div>
        </Panel>
      ) : !latest ? (
        <Panel bodyClassName="p-6">
          <EmptyState
            icon={<Download className="size-5" />}
            title="Indisponível no momento"
            text="Ainda não há uma versão publicada. Desculpe, tente novamente em breve."
          />
        </Panel>
      ) : (
        <Panel title={`Versão ${latest.version}`} description={latest.name} bodyClassName="space-y-4 p-5">
          <p className="whitespace-pre-wrap text-[13.5px] text-muted">{latest.changelog}</p>
          {latest.mandatory && <p className="text-[12.5px] text-orange">Esta atualização é obrigatória.</p>}
          <Button
            variant="action"
            loading={pending}
            icon={<Download className="size-4" />}
            onClick={() =>
              run(requestDownload, { title: "Download autorizado", description: "O arquivo abre em uma nova aba, válido por 60 segundos." }, (data) => {
                window.open(data.url, "_blank", "noopener");
              })
            }
          >
            Baixar {latest.file_name ?? `extensao-v${latest.version}.zip`}
          </Button>
        </Panel>
      )}
    </>
  );
}

export function UpdatesView({ versions }: { versions: ExtensionVersion[] }) {
  return (
    <>
      <PageHeader icon={RefreshCw} title="Atualizações" description="O que mudou em cada versão publicada da extensão." />
      {versions.length === 0 ? (
        <EmptyState icon={<RefreshCw className="size-5" />} title="Nenhuma atualização" text="Quando uma versão for publicada, o changelog aparece aqui." />
      ) : (
        <div className="space-y-3">
          {versions.map((v) => (
            <Panel key={v.id} title={`${v.version} · ${v.name}`} description={v.published_at ? formatDate(v.published_at) : v.status} bodyClassName="p-5">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-muted">{v.changelog}</p>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

export function DevicesView({ devices, plans }: { devices: Device[]; plans?: Plan[] }) {
  void plans;
  const columns: Column<Device>[] = [
    { key: "name", header: "Dispositivo", cell: (d) => <span className="font-medium">{d.name || "Sem nome"}</span> },
    { key: "fp", header: "Identificador", cell: (d) => <span className="font-mono text-[12px] text-muted">{d.fingerprint.slice(0, 12)}…</span> },
    { key: "seen", header: "Último acesso", cell: (d) => <span className="text-muted">{formatDateTime(d.last_seen_at)}</span> },
  ];

  return (
    <>
      <PageHeader icon={MonitorSmartphone} title="Dispositivos" description="Aparecem quando a extensão se conecta com a sua licença." />
      <DataTable
        title="Instalações"
        rows={devices}
        columns={columns}
        getKey={(d) => d.id}
        emptyText="Nenhum dispositivo ainda. Depois de instalar a extensão, ela registra o aparelho aqui."
      />
    </>
  );
}
