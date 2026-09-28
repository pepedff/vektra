"use client";

import { animate, AnimatePresence, motion, useAnimationControls, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ChevronDown, QrCode, ShieldCheck, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/dashboard/row-menu";
import { ActionButton, type ActionState } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { quote, type CouponQuote } from "@/lib/billing/pricing";
import { formatCents } from "@/lib/format";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Order, Plan } from "@/lib/supabase/types";
import { checkCoupon, createOrder, markOrderPaid, type OrderCharge } from "@/server/order-actions";

type Step = "form" | "pix" | "waiting" | "done";

export type CheckoutTarget = { plan: Plan; quantity: number; charge?: OrderCharge };

const cents = formatCents;
const EASE = [0.16, 1, 0.3, 1] as const;
// Cor de fundo do modal, usada nos "recortes" do recibo
const MODAL_BG = "bg-[#10151f]";

const PIX_STEPS = ["Abra a área PIX no app do seu banco", "Escaneie o QR Code ou cole o código abaixo", "Volte aqui e toque em “Já paguei”"];

type OrderStatusHandlers = { onPaid: () => void; onRejected: (reason: string | null) => void };

function useOrderStatus(orderId: string | undefined, handlers: OrderStatusHandlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    if (!orderId) return;
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
        const row = payload.new as Order;
        if (row.status === "pago") ref.current.onPaid();
        if (row.status === "recusado") ref.current.onRejected(row.reject_reason);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);
}

export function CheckoutModal({ target, onClose }: { target: CheckoutTarget | null; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const reduce = Boolean(useReducedMotion());
  const shake = useAnimationControls();
  const [step, setStep] = useState<Step>("form");
  const [state, setState] = useState<ActionState>("idle");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const [charge, setCharge] = useState<OrderCharge | null>(null);
  const [paying, setPaying] = useState(false);

  const plan = target?.plan;
  const qty = target?.quantity ?? 1;
  const price = plan ? quote({ priceCents: plan.price_cents, quantity: qty, coupon }) : null;

  useEffect(() => {
    if (!target) return;
    setStep(target.charge ? "pix" : "form");
    setCharge(target.charge ?? null);
    setState("idle");
    setCouponOpen(false);
    setCouponInput("");
    setCoupon(null);
    setCouponError(undefined);
    setChecking(false);
    setPaying(false);
  }, [target]);

  useOrderStatus(step === "waiting" ? charge?.order.id : undefined, {
    onPaid: () => {
      setStep("done");
      router.refresh();
    },
    onRejected: (reason) => {
      toast({ type: "error", title: "Pagamento não identificado", description: reason ?? "Fale com o suporte se você já pagou." });
      onClose();
      router.refresh();
    },
  });

  const failCoupon = (message: string) => {
    setCoupon(null);
    setCouponError(message);
    if (!reduce) void shake.start({ x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.38 } });
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    setCouponError(undefined);
    if (!code) return setCoupon(null);
    if (checking) return;
    setChecking(true);
    const res = await checkCoupon(code);
    setChecking(false);
    if (!res.ok) return failCoupon(res.error);
    if (!res.data) return failCoupon("Cupom inválido, expirado ou esgotado.");
    setCoupon(res.data);
  };

  const generate = async () => {
    if (!plan || state === "loading") return;
    setState("loading");
    const res = await createOrder({ planId: plan.id, quantity: qty, coupon: coupon ? couponInput.trim() : "" });
    if (!res.ok) {
      setState("error");
      toast({ type: "error", title: "Não foi possível gerar o PIX", description: res.error });
      window.setTimeout(() => setState("idle"), 1600);
      return;
    }
    setCharge(res.data);
    setState("success");
    window.setTimeout(() => setStep("pix"), 500);
  };

  const confirmSent = async () => {
    if (!charge) return;
    setPaying(true);
    const res = await markOrderPaid(charge.order.id);
    setPaying(false);
    if (!res.ok) {
      toast({ type: "error", title: "Não foi possível avisar", description: res.error });
      return;
    }
    setStep("waiting");
    toast({ type: "info", title: "Recebemos seu aviso", description: "Sua licença será liberada assim que o PIX for confirmado." });
  };

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, x: 28, filter: "blur(4px)" },
        animate: { opacity: 1, x: 0, filter: "blur(0px)" },
        exit: { opacity: 0, x: -28, filter: "blur(4px)" },
        transition: { duration: 0.35, ease: EASE },
      };

  const rise = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 + i * 0.06, duration: 0.4, ease: EASE } };

  const total = charge ? charge.order.amount_cents : (price?.totalCents ?? 0);
  const title = step === "done" ? "Tudo certo!" : step === "waiting" ? "Pagamento em análise" : step === "pix" ? "Pague com PIX" : "Finalizar compra";

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={title}
      description={step === "form" ? "Pagamento único via PIX, sem cartão e sem renovação automática." : undefined}
      icon={step === "pix" ? <QrCode className="size-5" /> : <ShieldCheck className="size-5" />}
      className="max-w-[520px]"
    >
      <AutoHeight reduce={reduce}>
        <AnimatePresence mode="wait" initial={false}>
          {/* ───────────── Resumo (recibo) ───────────── */}
          {step === "form" && plan && price && (
            <motion.form
              key="form"
              {...slide}
              onSubmit={(e) => {
                e.preventDefault();
                void generate();
              }}
              className="space-y-4"
              noValidate
            >
              <motion.div {...rise(0)} className="relative overflow-hidden rounded-2xl border border-line bg-white/[0.02]">
                <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
                  <div className="min-w-0">
                    <p className="text-[12px] text-subtle">{qty > 1 ? "Licenças" : "Plano"}</p>
                    <p className="mt-0.5 truncate text-[18px] font-semibold">
                      {qty > 1 && <span className="text-blue tabular">{qty}× </span>}
                      {plan.name}
                    </p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {plan.credits} · {plan.duration_days} dias
                      {qty > 1 && ` · ${cents(price.unitCents)} cada`}
                    </p>
                  </div>
                  {qty > 1 && (
                    <span className="shrink-0 rounded-full border border-green/25 bg-green/10 px-2 py-0.5 text-[11px] font-medium text-green">30% off</span>
                  )}
                </div>

                <Perforation />

                <div className="space-y-2 px-5 pt-4 pb-5 text-[13px]">
                  <Row label="Subtotal" value={cents(price.subtotalCents)} />
                  <AnimatePresence initial={false}>
                    {price.discountCents > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <Row
                          label={
                            <span className="flex items-center gap-1.5">
                              Desconto
                              {coupon && (
                                <span className="flex items-center gap-1 rounded-md bg-green/10 px-1.5 py-px text-[11px] text-green">
                                  <Tag className="size-3" />
                                  {couponInput.trim()}
                                </span>
                              )}
                            </span>
                          }
                          value={<span className="text-green">− {cents(price.discountCents)}</span>}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-end justify-between border-t border-line pt-3">
                    <span className="text-[13px] text-muted">Total</span>
                    <AnimatedCents value={price.totalCents} className="text-[26px] leading-none font-bold tabular" />
                  </div>
                </div>
              </motion.div>

              {/* Cupom recolhido por padrão */}
              <motion.div {...rise(1)}>
                <button
                  type="button"
                  onClick={() => setCouponOpen((v) => !v)}
                  aria-expanded={couponOpen}
                  className="flex items-center gap-1.5 text-[13px] text-blue transition-opacity hover:opacity-80"
                >
                  <Tag className="size-3.5" />
                  {coupon ? "Cupom aplicado" : "Tenho um cupom de desconto"}
                  <motion.span animate={{ rotate: couponOpen ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }} className="flex">
                    <ChevronDown className="size-3.5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {couponOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="-mx-1 overflow-hidden px-1"
                    >
                      <div className="pt-3 pb-1">
                        <Field label="Código do cupom" htmlFor="ck-coupon" error={couponError}>
                          <motion.div animate={shake} className="flex gap-2">
                            <Input
                              id="ck-coupon"
                              autoFocus
                              leading={<Tag className="size-4" />}
                              placeholder="EX: PROMO10"
                              value={couponInput}
                              invalid={!!couponError}
                              onChange={(e) => {
                                setCouponInput(e.target.value.toUpperCase());
                                setCoupon(null);
                                setCouponError(undefined);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void applyCoupon();
                                }
                              }}
                            />
                            <Button type="button" variant="secondary" onClick={() => void applyCoupon()} disabled={!couponInput.trim() || checking}>
                              {checking ? "Aplicando..." : "Aplicar"}
                            </Button>
                          </motion.div>
                        </Field>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div {...rise(2)} className="pt-1">
                <ActionButton type="submit" state={state} loadingText="Gerando cobrança..." successText="PIX gerado" errorText="Tente novamente">
                  Gerar PIX de {cents(price.totalCents)}
                </ActionButton>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-subtle">
                  <ShieldCheck className="size-3.5" /> O valor é conferido pelo servidor antes da cobrança
                </p>
              </motion.div>
            </motion.form>
          )}

          {/* ───────────── PIX ───────────── */}
          {step === "pix" && charge && (
            <motion.div key="pix" {...slide} className="space-y-5">
              <div className="grid gap-6 pt-2 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="relative justify-self-center">
                  <motion.div
                    className="absolute -inset-3 rounded-[28px] bg-[radial-gradient(circle,rgb(0_168_255/0.3),transparent_70%)] blur-xl"
                    animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { scale: 0.88, opacity: 0, rotate: -2 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
                    className="relative size-48 overflow-hidden rounded-[20px] bg-white p-2 shadow-[0_20px_50px_-20px_rgb(0_168_255/0.6)] sm:size-44"
                  >
                    <img src={charge.pix.qrDataUrl} alt="QR Code PIX" className="size-full" />
                    {!reduce && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-x-3 h-[2px] rounded-full bg-blue/70 shadow-[0_0_12px_2px_rgb(0_168_255/0.55)]"
                        initial={{ top: "8%" }}
                        animate={{ top: ["8%", "91%", "8%"] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                      />
                    )}
                  </motion.div>
                </div>

                <div className="text-center sm:text-left">
                  <motion.div {...rise(1)}>
                    <p className="text-[12px] text-subtle">Valor a pagar</p>
                    <AnimatedCents value={total} from={0} className="block text-[28px] leading-tight font-bold tabular" />
                    <p className="mt-0.5 truncate text-[12px] text-subtle">Pedido {charge.order.pix_txid}</p>
                  </motion.div>
                  <ol className="mt-4 space-y-2.5 text-left">
                    {PIX_STEPS.map((text, i) => (
                      <motion.li key={text} {...rise(2 + i)} className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
                        <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] text-fg tabular">
                          {i + 1}
                        </span>
                        {text}
                      </motion.li>
                    ))}
                  </ol>
                </div>
              </div>

              <motion.div {...rise(5)}>
                <p className="mb-1.5 text-[12px] text-subtle">PIX copia e cola</p>
                <div className="flex w-full items-center gap-2 rounded-xl border border-line bg-[#0e131c] py-1.5 pr-1.5 pl-3.5 transition-colors hover:border-blue/30">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted">{charge.pix.payload}</span>
                  <CopyButton value={charge.pix.payload} label="Copiar código PIX" />
                </div>
              </motion.div>

              <motion.div {...rise(6)}>
                <ActionButton
                  state={paying ? "loading" : "idle"}
                  onClick={() => void confirmSent()}
                  icon={<DrawCheck className="size-[18px]" strokeWidth={2.6} animateIn={false} />}
                  loadingText="Enviando aviso..."
                >
                  Já paguei
                </ActionButton>
              </motion.div>
            </motion.div>
          )}

          {/* ───────────── Aguardando (linha do tempo) ───────────── */}
          {step === "waiting" && (
            <motion.div key="waiting" {...slide} className="pt-1">
              <ol className="relative">
                <TimelineItem index={0} state="done" label="Pedido criado" reduce={reduce} />
                <TimelineItem index={1} state="done" label="Aviso de pagamento enviado" reduce={reduce} />
                <TimelineItem
                  index={2}
                  state="active"
                  label="Conferindo o PIX"
                  hint="Esta janela atualiza sozinha. Você também recebe uma notificação no painel."
                  reduce={reduce}
                />
                <TimelineItem index={3} state="pending" label="Licença liberada" last reduce={reduce} />
              </ol>
              <motion.div {...rise(5)}>
                <Button variant="secondary" className="mt-6 w-full" onClick={onClose}>
                  Fechar e aguardar
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ───────────── Confirmado (cartão da licença) ───────────── */}
          {step === "done" && (
            <motion.div key="done" {...slide} className="flex flex-col items-center pt-6 text-center">
              <motion.span
                initial={reduce ? { opacity: 0 } : { scale: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="relative flex size-16 items-center justify-center rounded-full bg-green/15 text-green ring-1 ring-green/30"
              >
                {!reduce && (
                  <motion.span
                    className="absolute inset-0 rounded-full ring-2 ring-green/40"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: 2, delay: 0.2 }}
                  />
                )}
                <DrawCheck className="size-8" strokeWidth={2.6} animateIn={!reduce} />
              </motion.span>
              <motion.p {...rise(2)} className="mt-5 text-[18px] font-semibold">
                Pagamento confirmado
              </motion.p>

              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, rotateX: 18 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.35, duration: 0.55, ease: EASE }}
                style={{ transformPerspective: 800 }}
                className="mt-5 w-full rounded-2xl border border-green/25 bg-green/[0.05] p-4 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] text-subtle">{qty > 1 ? "Suas licenças" : "Sua licença"}</p>
                    <p className="truncate text-[16px] font-semibold">
                      {qty > 1 && <span className="tabular">{qty}× </span>}
                      {plan?.name}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[11.5px] font-medium text-green">
                    <span className="size-1.5 rounded-full bg-green" /> Ativa
                  </span>
                </div>
                {plan && (
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-green/15 pt-3 text-[12.5px]">
                    <div>
                      <p className="text-subtle">Duração</p>
                      <p className="mt-0.5 font-medium text-fg tabular">{plan.duration_days} dias</p>
                    </div>
                    <div>
                      <p className="text-subtle">Inclui</p>
                      <p className="mt-0.5 truncate font-medium text-fg">{plan.credits}</p>
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.div {...rise(5)} className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                  Fechar
                </Button>
                <Button
                  variant="action"
                  className="flex-1"
                  onClick={() => {
                    onClose();
                    router.push("/painel");
                  }}
                >
                  Ver minhas licenças
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AutoHeight>
    </Modal>
  );
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

/** Linha picotada do recibo, com recortes nas laterais */
function Perforation() {
  return (
    <div className="relative h-0">
      <span className={`absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full border border-line ${MODAL_BG}`} />
      <span className={`absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full border border-line ${MODAL_BG}`} />
      <div className="mx-4 border-t border-dashed border-line" />
    </div>
  );
}

function TimelineItem({
  index,
  state,
  label,
  hint,
  last,
  reduce,
}: {
  index: number;
  state: "done" | "active" | "pending";
  label: string;
  hint?: string;
  last?: boolean;
  reduce: boolean;
}) {
  const delay = reduce ? 0 : 0.1 + index * 0.12;
  return (
    <motion.li
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
      className={`relative pl-9 ${last ? "" : "pb-5"}`}
    >
      {!last && (
        <span className="absolute top-6 bottom-0 left-[11px] w-px overflow-hidden bg-line">
          {state === "done" && (
            <motion.span
              className="block h-full w-full bg-green/50"
              style={{ originY: 0 }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + 0.2, duration: 0.4, ease: EASE }}
            />
          )}
        </span>
      )}

      <span className="absolute top-0 left-0 flex size-6 items-center justify-center">
        {state === "done" && (
          <span className="flex size-6 items-center justify-center rounded-full bg-green/15 text-green ring-1 ring-green/30">
            <DrawCheck className="size-3.5" strokeWidth={3} animateIn={!reduce} delay={delay + 0.1} />
          </span>
        )}
        {state === "active" && (
          <span className="relative flex size-6 items-center justify-center rounded-full bg-yellow/10 ring-1 ring-yellow/30">
            {!reduce && (
              <motion.span
                className="absolute inset-0 rounded-full ring-1 ring-yellow/50"
                animate={{ scale: [1, 1.7], opacity: [0.8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <span className="size-2 rounded-full bg-yellow" />
          </span>
        )}
        {state === "pending" && <span className="size-6 rounded-full border border-dashed border-line" />}
      </span>

      <p className={`pt-0.5 text-[14px] ${state === "pending" ? "text-subtle" : state === "active" ? "font-semibold text-fg" : "text-muted"}`}>
        {label}
        {state === "active" && <Dots reduce={reduce} />}
      </p>
      {hint && <p className="mt-1 max-w-[340px] text-[12.5px] text-subtle">{hint}</p>}
    </motion.li>
  );
}

function Dots({ reduce }: { reduce: boolean }) {
  return (
    <span className="ml-0.5 inline-flex gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="text-yellow"
          animate={reduce ? { opacity: 0.8 } : { opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

/** Anima a altura do modal entre as etapas em vez de dar um pulo */
function AutoHeight({ children, reduce }: { children: ReactNode; reduce: boolean }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // -m-2/p-2: folga para sombras, brilho do QR e anel de foco não serem cortados
    <motion.div className="-m-2 overflow-hidden" animate={{ height }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34 }}>
      <div ref={inner} className="p-2">
        {children}
      </div>
    </motion.div>
  );
}

/** Valor em reais que "rola" até o novo número */
function AnimatedCents({ value, from, className }: { value: number; from?: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(from ?? value);
  const text = useTransform(mv, (v) => cents(Math.round(v)));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.7, ease: EASE });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}

/** Check que se desenha */
function DrawCheck({
  className,
  strokeWidth = 2,
  animateIn,
  delay = 0.3,
}: {
  className?: string;
  strokeWidth?: number;
  animateIn: boolean;
  delay?: number;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M4 12.5l5 5L20 6.5"
        initial={animateIn ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: 0.45, ease: "easeOut" }}
      />
    </svg>
  );
}