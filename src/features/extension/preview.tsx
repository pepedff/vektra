"use client";

import { Paperclip, Send } from "lucide-react";
import { mergeAi, type AiConfig } from "@/lib/extension/ai";
import { DEFAULT_AI } from "@/lib/extension/ai";
import { DEFAULT_BRANDING, mergeBranding, type Branding } from "@/lib/extension/branding";

export function ExtensionPreview({ branding, ai }: { branding?: Partial<Branding>; ai?: Partial<AiConfig> }) {
  const b = mergeBranding(DEFAULT_BRANDING, branding ?? null);
  const a = mergeAi(DEFAULT_AI, ai ?? null);
  const radius = `${b.radius}px`;

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-[#1a1f2b]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#222838] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 truncate text-[12px] text-white/45">lovable.dev — projeto</span>
      </div>
      <div className="grid min-h-[420px] grid-cols-[1fr_300px] max-md:grid-cols-1">
        <div className="relative bg-[#0f1320] p-5">
          <div className="mb-4 h-3 w-32 rounded bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-24 rounded-xl border border-white/[0.06] bg-white/[0.03]" />
            <div className="h-24 rounded-xl border border-white/[0.06] bg-white/[0.03]" />
          </div>
          <p className="absolute right-4 bottom-4 text-[10.5px] tracking-wider text-white/25 uppercase">Lovable</p>
        </div>
        <aside
          className="flex flex-col border-l border-white/[0.06] max-md:border-t max-md:border-l-0"
          style={{ background: b.sidebar, color: b.theme === "dark" ? "#f3f6fb" : "#111", fontFamily: b.font }}
        >
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-3.5 py-3">
            <span className="flex size-8 items-center justify-center text-[11px] font-bold text-white" style={{ background: b.gradient, borderRadius: radius }}>
              {(b.extensionName[0] ?? "V").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{b.extensionName}</p>
              <p className="truncate text-[11px] opacity-60">{a.assistantName}</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-hidden p-3" style={{ background: b.chat }}>
            <div className="px-3 py-2.5 text-[12.5px] leading-relaxed" style={{ background: b.cards, borderRadius: radius, boxShadow: b.glow ? `0 0 24px ${b.colorPrimary}33` : undefined }}>
              {a.welcomeMessage}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {b.suggestions.map((s) => (
                <span key={s} className="px-2 py-1 text-[11px]" style={{ background: b.cards, borderRadius: radius, opacity: 0.85 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.08] p-3">
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: b.inputs, borderRadius: radius }}>
              {a.allowAttachments && <Paperclip className="size-3.5 opacity-50" />}
              <span className="flex-1 truncate text-[12px] opacity-40">{a.chatPlaceholder}</span>
              <span className="flex size-7 items-center justify-center text-white" style={{ background: b.buttons, borderRadius: radius }}>
                <Send className="size-3.5" />
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
