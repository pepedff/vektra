"use client";

import { Bot, MessageSquare } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { DEFAULT_AI, mergeAi, type AiConfig } from "@/lib/extension/ai";
import { DEFAULT_BRANDING, mergeBranding, type Branding } from "@/lib/extension/branding";
import { useAction } from "@/lib/use-action";
import { saveGlobalSettings } from "@/server/extension-actions";
import { ExtensionPreview } from "./preview";

type Tab = "ia" | "prompts" | "modelos";

export function AiView({ tab, branding, ai }: { tab: Tab; branding: Partial<Branding>; ai: Partial<AiConfig> }) {
  const { run, pending } = useAction();
  const [draft, setDraft] = useState<AiConfig>(() => mergeAi(DEFAULT_AI, ai));
  const [brand] = useState(() => mergeBranding(DEFAULT_BRANDING, branding));
  const set = <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const title = tab === "prompts" ? "Prompts" : tab === "modelos" ? "Modelos" : "Configuração da IA";

  return (
    <>
      <PageHeader
        icon={tab === "prompts" ? MessageSquare : Bot}
        title={title}
        description="Controla a agent embutida na extensão — não é um produto separado."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
          {tab === "ia" && (
            <>
              <Field label="Nome exibido da assistente" htmlFor="an">
                <Input id="an" value={draft.assistantName} onChange={(e) => set("assistantName", e.target.value)} />
              </Field>
              <Field label="Placeholder do chat" htmlFor="ap">
                <Input id="ap" value={draft.chatPlaceholder} onChange={(e) => set("chatPlaceholder", e.target.value)} />
              </Field>
              <Field label="Mensagem inicial" htmlFor="aw" className="sm:col-span-2">
                <Textarea id="aw" value={draft.welcomeMessage} onChange={(e) => set("welcomeMessage", e.target.value)} />
              </Field>
              <Switch checked={draft.allowAttachments} onChange={(v) => set("allowAttachments", v)} label="Permitir anexos" />
              <Switch checked={draft.allowImages} onChange={(v) => set("allowImages", v)} label="Permitir imagens" />
              <Switch checked={draft.allowCode} onChange={(v) => set("allowCode", v)} label="Permitir geração de código" />
              <Switch checked={draft.allowFileEdit} onChange={(v) => set("allowFileEdit", v)} label="Permitir edição de arquivos" />
              <Switch checked={draft.allowProjectRead} onChange={(v) => set("allowProjectRead", v)} label="Permitir leitura do projeto" />
            </>
          )}
          {tab === "prompts" && (
            <>
              <Field label="Mensagem inicial" htmlFor="pw" className="sm:col-span-2">
                <Textarea id="pw" value={draft.welcomeMessage} onChange={(e) => set("welcomeMessage", e.target.value)} />
              </Field>
              <Field label="Prompt do sistema" htmlFor="ps" className="sm:col-span-2">
                <Textarea id="ps" rows={8} value={draft.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} />
              </Field>
            </>
          )}
          {tab === "modelos" && (
            <>
              <Field label="Modelo utilizado" htmlFor="mm">
                <Input id="mm" value={draft.model} onChange={(e) => set("model", e.target.value)} />
              </Field>
              <Field label="Temperatura" htmlFor="mt">
                <Input id="mt" type="number" step="0.1" min={0} max={2} value={draft.temperature} onChange={(e) => set("temperature", Number(e.target.value))} />
              </Field>
              <Field label="Limite de contexto" htmlFor="mc">
                <Input id="mc" type="number" value={draft.contextLimit} onChange={(e) => set("contextLimit", Number(e.target.value))} />
              </Field>
              <Field label="Timeout (ms)" htmlFor="mto">
                <Input id="mto" type="number" value={draft.timeoutMs} onChange={(e) => set("timeoutMs", Number(e.target.value))} />
              </Field>
            </>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <Button variant="action" loading={pending} onClick={() => run(() => saveGlobalSettings(brand, draft), { title: "Configuração da IA salva" })}>
              Salvar
            </Button>
          </div>
        </Panel>
        <ExtensionPreview branding={brand} ai={draft} />
      </div>
    </>
  );
}
