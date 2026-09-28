"use client";

import { Blocks, Download, FileArchive, RefreshCw } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Switch } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/format";
import { getBrowserClient } from "@/lib/supabase/client";
import type { DownloadEvent, ExtensionVersion } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { publishVersion, saveVersion } from "@/server/extension-actions";

export function VersionsView({ versions, mode }: { versions: ExtensionVersion[]; mode: "versoes" | "arquivos" | "atualizacoes" }) {
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState({ version: "", name: "", changelog: "", mandatory: false });

  const columns: Column<ExtensionVersion>[] = [
    { key: "v", header: "Versão", cell: (v) => <span className="font-mono font-semibold">{v.version}</span> },
    { key: "n", header: "Nome", cell: (v) => v.name },
    { key: "s", header: "Status", cell: (v) => <StatusBadge status={v.status} /> },
    { key: "f", header: "Arquivo", cell: (v) => <span className="text-muted">{v.file_name ?? "—"}</span> },
    { key: "d", header: "Criada", cell: (v) => <span className="text-muted">{formatDateTime(v.created_at)}</span> },
  ];

  const submit = async () => {
    let storagePath = "";
    let fileName = "";
    if (file) {
      if (file.type && !file.type.includes("zip") && !file.name.endsWith(".zip")) {
        return;
      }
      const path = `releases/${draft.version}-${Date.now()}.zip`;
      const up = await getBrowserClient().storage.from("extension-releases").upload(path, file, { contentType: "application/zip", upsert: false });
      if (up.error) {
        console.error("[upload]", up.error);
        return;
      }
      storagePath = path;
      fileName = file.name.slice(0, 120);
    }
    run(
      () => saveVersion({ ...draft, storagePath, fileName }),
      { title: "Versão salva" },
      () => {
        setOpen(false);
        setFile(null);
        setDraft({ version: "", name: "", changelog: "", mandatory: false });
      },
    );
  };

  return (
    <>
      <PageHeader
        icon={mode === "arquivos" ? FileArchive : mode === "atualizacoes" ? RefreshCw : Blocks}
        title={mode === "arquivos" ? "Arquivos" : mode === "atualizacoes" ? "Atualizações" : "Versões"}
        description={
          mode === "arquivos"
            ? "ZIP oficial de cada versão da extensão."
            : mode === "atualizacoes"
              ? "O que os clientes veem depois da publicação."
              : "Rascunho, arquivo e publicação da extensão."
        }
        actions={
          mode !== "atualizacoes" ? (
            <Button variant="action" onClick={() => setOpen(true)}>
              Nova versão
            </Button>
          ) : undefined
        }
      />
      <DataTable
        title={mode === "atualizacoes" ? "Publicadas" : "Versões"}
        rows={mode === "atualizacoes" ? versions.filter((v) => v.status !== "rascunho") : versions}
        columns={columns}
        getKey={(v) => v.id}
        emptyText="Nenhuma versão ainda."
        rowActions={
          mode === "atualizacoes"
            ? undefined
            : (v) =>
                v.status === "rascunho" ? (
                  <Button size="sm" variant="action" disabled={pending || !v.storage_path} onClick={() => run(() => publishVersion(v.id), { title: `Versão ${v.version} publicada` })}>
                    Publicar
                  </Button>
                ) : null
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova versão"
        description="O arquivo .zip só fica disponível depois de publicar."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="action" loading={pending} onClick={() => void submit()}>
              Salvar rascunho
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Número" htmlFor="ver">
            <Input id="ver" placeholder="1.5.0" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} />
          </Field>
          <Field label="Nome" htmlFor="vname">
            <Input id="vname" placeholder="Correções da interface" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Changelog" htmlFor="vlog">
            <Textarea id="vlog" value={draft.changelog} onChange={(e) => setDraft({ ...draft, changelog: e.target.value })} />
          </Field>
          <Field label="Arquivo .zip" htmlFor="vfile">
            <Input id="vfile" type="file" accept=".zip,application/zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <Switch checked={draft.mandatory} onChange={(mandatory) => setDraft({ ...draft, mandatory })} label="Atualização obrigatória" />
        </div>
      </Modal>
    </>
  );
}

export function DownloadsView({ events }: { events: DownloadEvent[] }) {
  const columns: Column<DownloadEvent>[] = [
    { key: "u", header: "Cliente", cell: (e) => e.profiles?.full_name || e.profiles?.email || "—" },
    { key: "v", header: "Versão", cell: (e) => e.extension_versions?.version ?? "—" },
    { key: "d", header: "Quando", cell: (e) => <span className="text-muted">{formatDateTime(e.created_at)}</span> },
  ];
  return (
    <>
      <PageHeader icon={Download} title="Downloads" description="Cada download autorizado da extensão." />
      <DataTable title="Histórico" rows={events} columns={columns} getKey={(e) => String(e.id)} emptyText="Nenhum download ainda." />
    </>
  );
}
