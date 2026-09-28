"use client";

import { Puzzle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { StatCard } from "@/components/dashboard/stat-card";
import type { AiConfig } from "@/lib/extension/ai";
import type { Branding } from "@/lib/extension/branding";
import type { DownloadEvent, ExtensionVersion } from "@/lib/supabase/types";
import { ExtensionPreview } from "./preview";

export function AdminExtensionOverview({
  latest,
  downloads,
  branding,
  ai,
}: {
  latest: ExtensionVersion | null;
  downloads: number;
  branding: Partial<Branding>;
  ai: Partial<AiConfig>;
  recent?: DownloadEvent[];
}) {
  return (
    <>
      <PageHeader icon={Puzzle} title="Extensão" description="Produto único. A agent vive dentro da extensão, na Lovable." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Versão publicada" value={latest ? 1 : 0} hint={latest ? latest.version : "nenhuma"} tone="blue" icon={Puzzle} />
        <StatCard label="Downloads" value={downloads} hint="autorizados" tone="green" icon={Puzzle} />
        <StatCard label="Obrigatória" value={latest?.mandatory ? 1 : 0} hint={latest?.mandatory ? "os clientes precisam atualizar" : "opcional"} tone="purple" icon={Puzzle} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel title="Como os clientes usam" bodyClassName="space-y-2 p-5 text-[13.5px] leading-relaxed text-muted">
          <p>Eles compram a licença no painel, baixam o ZIP publicado e instalam no navegador.</p>
          <p>Na Lovable, a extensão troca a área da agent original pela nossa interface.</p>
          <p>Personalização e IA desta página valem para a extensão padrão. Revendedores só alteram o que você liberar.</p>
        </Panel>
        <ExtensionPreview branding={branding} ai={ai} />
      </div>
    </>
  );
}
