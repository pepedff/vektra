"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, ExternalLink, Pin, Send, Trash2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, Panel } from "@/components/dashboard/panel";
import { ActionButton, type ActionState } from "@/components/ui/action-button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { TOAST_STYLES, ToastCard, useToast, type ToastType } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { formatDateTime, formatInt } from "@/lib/format";
import type { Audience, NotificationRow, Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { deleteNotification, notificationReach, sendNotification } from "@/server/admin-actions";
import type { CustomerOption } from "./add-license-modal";

const TYPES: { value: ToastType; label: string }[] = [
  { value: "info", label: "Informação" },
  { value: "success", label: "Sucesso" },
  { value: "warning", label: "Aviso" },
  { value: "error", label: "Erro" },
];

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "todos", label: "Todos os usuários" },
  { value: "especificos", label: "Usuários específicos" },
  { value: "plano", label: "Determinado plano" },
  { value: "ativos", label: "Com licença ativa" },
  { value: "expirados", label: "Com licença expirada" },
];

function audienceLabel(n: NotificationRow, plans: Plan[]): string {
  const base = AUDIENCES.find((a) => a.value === n.audience)?.label ?? n.audience;
  if (n.audience === "plano") return `${base} · ${plans.find((p) => p.id === n.audience_detail.plan_id)?.name ?? "—"}`;
  if (n.audience === "especificos") return `${base} · ${n.audience_detail.user_ids?.length ?? 0} selecionados`;
  return base;
}

export function NotificationsView({
  notifications,
  customers,
  plans,
}: {
  notifications: NotificationRow[];
  customers: CustomerOption[];
  plans: Plan[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { run, pending } = useAction();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const [audience, setAudience] = useState<Audience>("todos");
  const [plan, setPlan] = useState<string>(plans[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [pinned, setPinned] = useState(false);
  const [reach, setReach] = useState<number | null>(null);
  const [state, setState] = useState<ActionState>("idle");
  const [errors, setErrors] = useState<{ title?: string; message?: string; audience?: string }>({});
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(async () => {
      const res = await notificationReach(audience, audience === "especificos" ? selected : [], audience === "plano" ? plan : undefined);
      if (cancelled) return;
      if (res.ok) setReach(res.data);
      else {
        setReach(null);
        console.error("[notificationReach]", res.error);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [audience, selected, plan]);

  const settle = (s: ActionState, ms: number) => {
    setState(s);
    timer.current = window.setTimeout(() => setState("idle"), ms);
  };

  const submit = async () => {
    if (state === "loading") return;
    const next: typeof errors = {};
    if (title.trim().length < 3) next.title = "Dê um título com pelo menos 3 caracteres.";
    if (message.trim().length < 5) next.message = "Escreva a mensagem que o cliente vai ler.";
    if (audience === "especificos" && selected.length === 0) next.audience = "Selecione pelo menos um cliente.";
    setErrors(next);
    if (Object.keys(next).length) {
      toast({ type: "error", title: "Revise a notificação", description: Object.values(next)[0] });
      settle("error", 1500);
      return;
    }
    setState("loading");
    const res = await sendNotification({
      title,
      message,
      type,
      audience,
      userIds: audience === "especificos" ? selected : [],
      planId: audience === "plano" ? plan : undefined,
      pinned,
    });
    if (!res.ok) {
      toast({ type: "error", title: "Não foi possível enviar", description: res.error });
      settle("error", 1500);
      return;
    }
    toast({
      type: "success",
      title: "Notificação enviada",
      description: `Entregue em tempo real para ${formatInt(reach ?? 0)} ${reach === 1 ? "cliente" : "clientes"}${pinned ? " e fixada no painel" : ""}.`,
    });
    setTitle("");
    setMessage("");
    setPinned(false);
    settle("success", 2000);
    router.refresh();
  };

  const toggleCustomer = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const q = filter.trim().toLowerCase();
  const visibleCustomers = customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 40);

  return (
    <>
      <PageHeader
        icon={Bell}
        title="Notificações"
        description="Envie avisos em tempo real para o painel dos clientes."
        actions={
          <a
            href="/painel"
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-line-strong px-4 text-[13.5px] font-semibold text-fg transition-colors hover:bg-white/[0.05]"
          >
            <ExternalLink className="size-4" /> Abrir painel do cliente
          </a>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel title="Nova notificação" description="Aparece como toast no canto superior direito do painel." bodyClassName="space-y-5 p-5">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            noValidate
          >
            <Field label="Título" htmlFor="n-title" error={errors.title}>
              <Input id="n-title" value={title} maxLength={60} invalid={!!errors.title} placeholder="Ex.: Nova versão disponível" onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Mensagem" htmlFor="n-msg" error={errors.message} hint={`${message.length}/180 caracteres`}>
              <Textarea id="n-msg" value={message} maxLength={180} onChange={(e) => setMessage(e.target.value)} />
            </Field>

            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-fg/90">Tipo</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TYPES.map((t) => {
                  const s = TOAST_STYLES[t.value];
                  const Icon = s.icon;
                  const active = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setType(t.value)}
                      className={cn(
                        "relative flex h-11 items-center gap-2 overflow-hidden rounded-xl border px-3 text-[13px] font-medium transition-all duration-200 active:scale-[0.97]",
                        active ? "border-white/15 bg-white/[0.05] text-fg" : "border-line text-muted hover:border-white/12 hover:text-fg",
                      )}
                    >
                      {active && <span className="pointer-events-none absolute inset-0" style={{ background: s.glow }} />}
                      <span className={cn("relative flex size-5 items-center justify-center rounded-full", s.iconBg)}>
                        <Icon className="size-3" strokeWidth={2.6} />
                      </span>
                      <span className="relative">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-fg/90">Enviar para</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {AUDIENCES.map((a) => {
                  const active = audience === a.value;
                  return (
                    <label
                      key={a.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-200",
                        active ? "border-blue/40 bg-blue/[0.07]" : "border-line hover:border-white/12",
                      )}
                    >
                      <input type="radio" name="audience" value={a.value} checked={active} onChange={() => setAudience(a.value)} className="sr-only" />
                      <span className={cn("flex size-4 items-center justify-center rounded-full border transition-colors", active ? "border-cyan" : "border-white/20")}>
                        <motion.span initial={false} animate={{ scale: active ? 1 : 0 }} className="size-2 rounded-full bg-cyan" />
                      </span>
                      <span className="flex-1 text-[13.5px] font-medium">{a.label}</span>
                    </label>
                  );
                })}
              </div>

              <AnimatePresence initial={false} mode="wait">
                {audience === "plano" && (
                  <motion.div key="plan" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="pt-3">
                      <Select aria-label="Plano" value={plan} onChange={(e) => setPlan(e.target.value)}>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </motion.div>
                )}
                {audience === "especificos" && (
                  <motion.div key="specific" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="space-y-2 pt-3">
                      <Input aria-label="Filtrar clientes" placeholder="Filtrar por nome ou e-mail" value={filter} onChange={(e) => setFilter(e.target.value)} />
                      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                        {visibleCustomers.length === 0 && <p className="text-[12.5px] text-subtle">Nenhum cliente encontrado.</p>}
                        {visibleCustomers.map((c) => {
                          const on = selected.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleCustomer(c.id)}
                              className={cn(
                                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-all active:scale-95",
                                on ? "border-blue/40 bg-blue/12 text-cyan" : "border-line text-muted hover:text-fg",
                              )}
                            >
                              {c.name || c.email}
                              {on && <X className="size-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {errors.audience && <p className="mt-2 text-[12px] text-red">{errors.audience}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </fieldset>

            <div className="rounded-xl border border-line bg-white/[0.015] p-4">
              <Switch
                checked={pinned}
                onChange={setPinned}
                label="Fixar no painel"
                description="Além do toast, o aviso fica no topo do painel até o cliente dispensar."
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-[13px] text-muted sm:flex-1">
                <Users className="size-4" /> Alcance:
                <span className="font-semibold text-fg tabular">{reach === null ? "—" : formatInt(reach)}</span>
              </p>
              <div className="sm:w-[260px]">
                <ActionButton
                  type="submit"
                  state={state}
                  icon={<Send className="size-[18px]" />}
                  loadingText="Enviando..."
                  successText="Notificação enviada"
                  errorText="Revise os campos"
                >
                  Enviar notificação
                </ActionButton>
              </div>
            </div>
          </form>
        </Panel>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Preview em tempo real" bodyClassName="p-5">
            <div className="relative overflow-hidden rounded-2xl border border-line bg-bg p-4">
              <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-50" />
              <div className="relative mb-4 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-white/10" />
                <span className="size-2 rounded-full bg-white/10" />
                <span className="size-2 rounded-full bg-white/10" />
                <span className="ml-2 text-[10.5px] text-subtle">Painel do cliente</span>
              </div>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={type}
                  initial={{ opacity: 0, x: 30, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="relative ml-auto max-w-[340px]"
                >
                  <ToastCard type={type} title={title || "Título da notificação"} description={message || "A mensagem aparece aqui."} onClose={() => undefined} />
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>
                {pinned && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="relative overflow-hidden"
                  >
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-[12px]">
                      <Pin className="size-3.5 text-cyan" />
                      <span className="truncate font-medium">{title || "Título"}</span>
                      <span className="ml-auto text-subtle">fixado</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Panel>

          <Panel title="Histórico de envios" description={`${notifications.length} enviadas`} bodyClassName="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <EmptyState icon={<Send className="size-5" />} title="Nenhum envio ainda" text="As notificações enviadas aparecem aqui." />
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((n) => {
                  const s = TOAST_STYLES[n.type];
                  const Icon = s.icon;
                  return (
                    <li key={n.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", s.iconBg)}>
                        <Icon className="size-3.5" strokeWidth={2.4} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-[13.5px] font-medium">
                          {n.title}
                          {n.pinned && <Pin className="size-3 shrink-0 text-cyan" />}
                        </p>
                        <p className="mt-0.5 text-[12px] text-subtle">
                          {audienceLabel(n, plans)} · {formatDateTime(n.created_at)}
                        </p>
                      </div>
                      <Tooltip content="Remover">
                        <button
                          type="button"
                          disabled={pending}
                          aria-label={`Remover ${n.title}`}
                          onClick={() => run(() => deleteNotification(n.id), { title: "Notificação removida" })}
                          className="flex size-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-red/10 hover:text-red disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
