"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Gauge,
  Hourglass,
  Info,
  KeyRound,
  Percent,
  Receipt,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AreaChart, type Point } from "@/components/dashboard/area-chart";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, Panel } from "@/components/dashboard/panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatBRL, formatBRLCompact, formatDateTime, formatInt, formatPercent, initials } from "@/lib/format";
import type { AuditLog, RevenuePoint, RevenueRange } from "@/lib/supabase/types";
import { revenueSeries } from "@/server/admin-actions";
import type { DashboardData } from "@/server/admin-queries";

const EASE = [0.16, 1, 0.3, 1] as const;

const RANGES: { value: RevenueRange; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "ano", label: "Ano" },
];

const PER_BUCKET: Record<RevenueRange, string> = { hoje: "por hora", "7d": "por dia", "30d": "por dia", ano: "por mês" };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** `bucket` chega como horário local de São Paulo sem fuso ("2026-09-26T14:00:00"). */
function bucketLabel(bucket: string, range: RevenueRange): string {
  const [date, time = "00"] = bucket.split("T");
  const [, month, day] = date.split("-");
  if (range === "hoje") return `${time.slice(0, 2)}h`;
  if (range === "ano") return MONTHS[Number(month) - 1];
  return `${day}/${month}`;
}

export function toPoints(series: RevenuePoint[], range: RevenueRange): Point[] {
  return series.map((p) => ({ label: bucketLabel(p.bucket, range), value: Number(p.value_cents) / 100 }));
}

const compactAxis = (n: number): string =>
  n >= 1000 ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : `R$ ${Math.round(n)}`;

/** Entrada em cascata dos blocos da página */
function rise(i: number, reduce: boolean) {
  return reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 + i * 0.08, duration: 0.55, ease: EASE } };
}

/** Número em reais que "rola" até o novo valor */
function AnimatedBRL({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => formatBRL(v));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.9, ease: EASE });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}

export function RevenueChartPanel({ initial, initialRange }: { initial: RevenuePoint[]; initialRange: RevenueRange }) {
  const { toast } = useToast();
  const reduce = Boolean(useReducedMotion());
  const [range, setRange] = useState<RevenueRange>(initialRange);
  const [data, setData] = useState<Point[]>(() => toPoints(initial, initialRange));
  const [loading, startLoading] = useTransition();
  const total = data.reduce((s, p) => s + p.value, 0);
  const avg = data.length > 0 ? total / data.length : 0;
  const peak = data.reduce<Point | null>((best, p) => (!best || p.value > best.value ? p : best), null);

  const change = (next: RevenueRange) => {
    setRange(next);
    startLoading(async () => {
      const res = await revenueSeries(next);
      if (!res.ok) {
        toast({ type: "error", title: "Não foi possível carregar a receita", description: res.error });
        return;
      }
      setData(toPoints(res.data, next));
    });
  };

  return (
    <Panel
      title="Receita"
      description="Pagamentos confirmados no período (horário de Brasília)."
      actions={<Segmented ariaLabel="Período do gráfico" value={range} onChange={change} options={RANGES} />}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 pt-5">
        <div>
          <p className="text-[12px] text-muted">Total no período</p>
          <AnimatedBRL value={total} className={cn("block text-[30px] leading-tight font-bold tracking-tight tabular transition-opacity", loading && "opacity-40")} />
        </div>
        <div className="flex gap-6 text-[12px]">
          <div>
            <p className="text-subtle">Média {PER_BUCKET[range]}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-fg tabular">{formatBRLCompact(avg)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-subtle">
              <TrendingUp className="size-3 text-green" /> Pico
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-fg tabular">
              {peak && peak.value > 0 ? (
                <>
                  {formatBRLCompact(peak.value)} <span className="font-normal text-subtle">em {peak.label}</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="px-2 pt-2 pb-3 sm:px-4">
        {loading ? (
          <div className="flex h-[280px] items-end gap-2 px-12 pb-8">
            {Array.from({ length: 14 }, (_, i) => (
              <motion.div
                key={i}
                className="flex-1"
                initial={{ height: "8%" }}
                animate={{ height: `${30 + ((i * 37) % 60)}%` }}
                transition={{ duration: 0.5, delay: i * 0.025, ease: EASE }}
              >
                <Skeleton className="size-full rounded-md" />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            key={range}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <AreaChart data={data} format={compactAxis} seriesKey={range} />
          </motion.div>
        )}
      </div>
    </Panel>
  );
}

const PLAN_COLORS = [
  { bar: "bg-[linear-gradient(90deg,#00a8ff,#00d5ff)]", dot: "bg-blue", text: "text-blue" },
  { bar: "bg-[linear-gradient(90deg,#7c3aed,#a78bfa)]", dot: "bg-purple", text: "text-violet" },
  { bar: "bg-[linear-gradient(90deg,#ec4899,#ff7518)]", dot: "bg-pink", text: "text-pink" },
];

const LOG_ICON = {
  info: { icon: Info, cls: "bg-blue/12 text-blue ring-blue/20" },
  warn: { icon: AlertTriangle, cls: "bg-yellow/12 text-yellow ring-yellow/20" },
  error: { icon: XCircle, cls: "bg-red/12 text-red ring-red/20" },
};

/** Atividade em formato de linha do tempo */
export function LogFeed({ logs }: { logs: AuditLog[] }) {
  const reduce = Boolean(useReducedMotion());
  if (logs.length === 0) return <EmptyState icon={<Info className="size-5" />} title="Sem atividade ainda" text="Ações importantes aparecem aqui." />;
  return (
    <div className="relative">
      {logs.map((l, i) => {
        const s = LOG_ICON[l.level];
        const last = i === logs.length - 1;
        return (
          <motion.div
            key={l.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduce ? 0 : 0.3 + i * 0.05, duration: 0.4, ease: EASE }}
            className="relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.025]"
          >
            {!last && <span aria-hidden className="absolute top-10 bottom-[-6px] left-[26px] w-px bg-line" />}
            <span className={cn("relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-1", s.cls)}>
              <s.icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-fg/90">{l.event}</p>
              <p className="mt-0.5 text-[11.5px] text-subtle">
                {l.profiles?.full_name || l.profiles?.email || "Sistema"} · {formatDateTime(l.created_at)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TopPlans({ plans, ticket, reduce }: { plans: DashboardData["topPlans"]; ticket: number; reduce: boolean }) {
  const total = plans.reduce((s, p) => s + Number(p.revenue_cents), 0);

  return (
    <Panel title="Planos mais vendidos" description="Receita confirmada nos últimos 30 dias." bodyClassName="p-5">
      {plans.length === 0 || total === 0 ? (
        <EmptyState icon={<Trophy className="size-5" />} title="Nenhuma venda no período" text="O ranking aparece após a primeira venda confirmada." />
      ) : (
        <>
          {/* Barra única dividida pela participação de cada plano */}
          <div className="flex h-3 gap-[3px] overflow-hidden rounded-full bg-white/[0.04]">
            {plans.map((p, i) => {
              const share = (Number(p.revenue_cents) / total) * 100;
              return (
                <motion.div
                  key={p.plan_id}
                  title={`${p.name}: ${formatPercent(share)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${share}%` }}
                  transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : 0.3 + i * 0.12, ease: EASE }}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", PLAN_COLORS[i % PLAN_COLORS.length].bar)}
                />
              );
            })}
          </div>

          <ol className="mt-5 space-y-1">
            {plans.map((p, i) => {
              const share = (Number(p.revenue_cents) / total) * 100;
              const color = PLAN_COLORS[i % PLAN_COLORS.length];
              const orders = Number(p.orders);
              return (
                <motion.li
                  key={p.plan_id}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.4 + i * 0.08, duration: 0.4, ease: EASE }}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.025]"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-[12px] font-bold text-muted tabular">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[13.5px] font-medium">
                      <span className={cn("size-2 shrink-0 rounded-full", color.dot)} />
                      <span className="truncate">{p.name}</span>
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-subtle tabular">
                      {formatInt(orders)} {orders === 1 ? "venda" : "vendas"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13.5px] font-semibold tabular">{formatBRLCompact(Number(p.revenue_cents) / 100)}</p>
                    <p className={cn("text-[11.5px] font-medium tabular", color.text)}>{formatPercent(share)}</p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </>
      )}

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-line bg-white/[0.02] p-4">
        <div className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-blue/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue/12 text-blue ring-1 ring-blue/20">
            <Receipt className="size-4" />
          </span>
          <div>
            <p className="text-[12px] text-muted">Ticket médio (30 dias)</p>
            <AnimatedBRL value={ticket / 100} className="block text-[19px] leading-tight font-bold tabular" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function RecentOrders({ orders, reduce }: { orders: DashboardData["recentOrders"]; reduce: boolean }) {
  return (
    <Panel
      title="Pedidos recentes"
      actions={
        <Link href="/admin/pedidos" className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-cyan">
          Ver todos
          <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      }
      bodyClassName="p-2"
    >
      {orders.length === 0 && <EmptyState icon={<Hourglass className="size-5" />} title="Nenhum pedido ainda" text="Os pedidos dos clientes aparecem aqui." />}
      {orders.map((o, i) => {
        const name = o.profiles?.full_name || o.profiles?.email || "Conta excluída";
        return (
          <motion.div
            key={o.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduce ? 0 : 0.3 + i * 0.05, duration: 0.4, ease: EASE }}
          >
            <Link href="/admin/pedidos" className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.025]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/[0.04] text-[11.5px] font-semibold text-muted transition-colors group-hover:border-blue/25 group-hover:text-fg">
                {initials(name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{name}</p>
                <p className="truncate text-[11.5px] text-subtle">{formatDateTime(o.created_at)}</p>
              </div>
              <p className="shrink-0 text-[13.5px] font-semibold tabular">{formatBRL(o.amount_cents / 100)}</p>
              <StatusBadge status={o.status} />
            </Link>
          </motion.div>
        );
      })}
    </Panel>
  );
}

export function AdminDashboardView({ data }: { data: DashboardData }) {
  const reduce = Boolean(useReducedMotion());
  const { metrics: m, topPlans, recentOrders, recentLogs } = data;
  const conversion = m.orders_30d > 0 ? (m.paid_orders_30d / m.orders_30d) * 100 : 0;
  const revenueDelta = m.revenue_prev_30d_cents > 0 ? ((m.revenue_30d_cents - m.revenue_prev_30d_cents) / m.revenue_prev_30d_cents) * 100 : undefined;
  const ticket = m.paid_orders_30d > 0 ? m.revenue_30d_cents / m.paid_orders_30d : 0;

  return (
    <>
      <PageHeader
        icon={Gauge}
        title="Dashboard"
        description="Receita, clientes e conversão."
        actions={
          <>
            {m.awaiting_orders > 0 && (
              <Button
                href="/admin/pedidos"
                variant="secondary"
                icon={
                  <span className="relative flex size-2.5">
                    {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-yellow/60" />}
                    <span className="relative size-2.5 rounded-full bg-yellow" />
                  </span>
                }
              >
                {m.awaiting_orders} aguardando
              </Button>
            )}
            <Button href="/admin/notificacoes" variant="action">
              Enviar aviso
            </Button>
          </>
        }
      />

      <motion.div {...rise(0, reduce)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Receita (30 dias)" value={m.revenue_30d_cents / 100} format={formatBRLCompact} icon={BadgeDollarSign} tone="blue" delta={revenueDelta} hint="vs. 30 dias anteriores" />
        <StatCard label="Receita hoje" value={m.revenue_today_cents / 100} format={formatBRLCompact} icon={ArrowUpRight} tone="cyan" hint={`total: ${formatBRLCompact(m.revenue_total_cents / 100)}`} />
        <StatCard label="Clientes" value={m.customers} format={formatInt} icon={Users} tone="purple" hint={`+${m.new_customers_30d} em 30 dias`} />
        <StatCard label="Licenças ativas" value={m.active_licenses} format={formatInt} icon={KeyRound} tone="green" hint="inclui testes" />
        <StatCard label="Conversão" value={conversion} format={(n) => formatPercent(n)} icon={Percent} tone="orange" hint="pedido → pago (30 dias)" />
      </motion.div>

      <motion.div {...rise(1, reduce)} className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <RevenueChartPanel initial={data.series} initialRange="30d" />
        <TopPlans plans={topPlans} ticket={ticket} reduce={reduce} />
      </motion.div>

      <motion.div {...rise(2, reduce)} className="mt-4 grid gap-4 xl:grid-cols-2">
        <RecentOrders orders={recentOrders} reduce={reduce} />
        <Panel
          title="Atividade recente"
          actions={
            <Link href="/admin/logs" className="group inline-flex items-center gap-1 text-[12.5px] font-semibold text-cyan">
              Ver logs
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          }
          bodyClassName="p-2"
        >
          <LogFeed logs={recentLogs} />
        </Panel>
      </motion.div>
    </>
  );
}