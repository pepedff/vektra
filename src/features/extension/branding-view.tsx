"use client";

import { Palette, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { DEFAULT_AI, type AiConfig } from "@/lib/extension/ai";
import { DEFAULT_BRANDING, mergeBranding, type Branding } from "@/lib/extension/branding";
import { useAction } from "@/lib/use-action";
import { saveGlobalSettings } from "@/server/extension-actions";
import { ExtensionPreview } from "./preview";

type Tab = "personalizacao" | "interface" | "comportamento";

export function BrandingView({
  tab,
  branding,
  ai,
}: {
  tab: Tab;
  branding: Partial<Branding>;
  ai: Partial<AiConfig>;
}) {
  const { run, pending } = useAction();
  const [draft, setDraft] = useState<Branding>(() => mergeBranding(DEFAULT_BRANDING, branding));
  const [aiDraft] = useState<AiConfig>(() => ({ ...DEFAULT_AI, ...ai }));
  const set = <K extends keyof Branding>(key: K, value: Branding[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const suggestionsText = useMemo(() => draft.suggestions.join("\n"), [draft.suggestions]);

  const icon = tab === "interface" ? Sparkles : tab === "comportamento" ? SlidersHorizontal : Palette;
  const title = tab === "interface" ? "Interface" : tab === "comportamento" ? "Comportamento" : "Personalização";

  return (
    <>
      <PageHeader icon={icon} title={title} description="Altera a aparência da extensão inteira, incluindo a agent embutida." />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
          {tab === "personalizacao" && (
            <>
              <Field label="Nome da extensão" htmlFor="bn">
                <Input id="bn" value={draft.extensionName} onChange={(e) => set("extensionName", e.target.value)} />
              </Field>
              <Field label="Nome da assistente" htmlFor="ba">
                <Input id="ba" value={draft.assistantName} onChange={(e) => set("assistantName", e.target.value)} />
              </Field>
              <Field label="Cor principal" htmlFor="bp">
                <Input id="bp" value={draft.colorPrimary} onChange={(e) => set("colorPrimary", e.target.value)} />
              </Field>
              <Field label="Cor secundária" htmlFor="bs">
                <Input id="bs" value={draft.colorSecondary} onChange={(e) => set("colorSecondary", e.target.value)} />
              </Field>
              <Field label="Gradiente" htmlFor="bg" className="sm:col-span-2">
                <Input id="bg" value={draft.gradient} onChange={(e) => set("gradient", e.target.value)} />
              </Field>
              <Field label="Tema" htmlFor="bt">
                <Select id="bt" value={draft.theme} onChange={(e) => set("theme", e.target.value as Branding["theme"])}>
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Switch checked={draft.glow} onChange={(glow) => set("glow", glow)} label="Glow" />
              </div>
            </>
          )}
          {tab === "interface" && (
            <>
              <Field label="Background" htmlFor="ibb">
                <Input id="ibb" value={draft.background} onChange={(e) => set("background", e.target.value)} />
              </Field>
              <Field label="Cards" htmlFor="ic">
                <Input id="ic" value={draft.cards} onChange={(e) => set("cards", e.target.value)} />
              </Field>
              <Field label="Inputs" htmlFor="ii">
                <Input id="ii" value={draft.inputs} onChange={(e) => set("inputs", e.target.value)} />
              </Field>
              <Field label="Botões" htmlFor="ib">
                <Input id="ib" value={draft.buttons} onChange={(e) => set("buttons", e.target.value)} />
              </Field>
              <Field label="Sidebar" htmlFor="is">
                <Input id="is" value={draft.sidebar} onChange={(e) => set("sidebar", e.target.value)} />
              </Field>
              <Field label="Chat" htmlFor="ich">
                <Input id="ich" value={draft.chat} onChange={(e) => set("chat", e.target.value)} />
              </Field>
              <Field label="Tipografia" htmlFor="if">
                <Input id="if" value={draft.font} onChange={(e) => set("font", e.target.value)} />
              </Field>
              <Field label="Border radius" htmlFor="ir">
                <Input id="ir" type="number" min={0} max={32} value={draft.radius} onChange={(e) => set("radius", Number(e.target.value))} />
              </Field>
            </>
          )}
          {tab === "comportamento" && (
            <>
              <Field label="Mensagem padrão" htmlFor="bm" className="sm:col-span-2">
                <Input id="bm" value={draft.messages} onChange={(e) => set("messages", e.target.value)} />
              </Field>
              <Field label="Sugestões iniciais (uma por linha)" htmlFor="bsg" className="sm:col-span-2">
                <Textarea id="bsg" value={suggestionsText} onChange={(e) => set("suggestions", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 8))} />
              </Field>
            </>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <Button variant="action" loading={pending} onClick={() => run(() => saveGlobalSettings(draft, aiDraft), { title: "Personalização salva" })}>
              Salvar
            </Button>
          </div>
        </Panel>
        <ExtensionPreview branding={draft} ai={aiDraft} />
      </div>
    </>
  );
}
