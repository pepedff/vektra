"use client";

import { CircleCheck, Download, Hourglass, Timer, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { formatBRLCompact } from "@/lib/format";
import type { Order, Plan } from "@/lib/supabase/types";
import { exportOrders, MyOrdersTable } from "./order-history";

export function PaymentsView({ orders, plans }: { orders: Order[]; plans: Plan[] }) {
  const paid = orders.filter((o) => o.status === "pago");
  const pending = orders.filter((o) => o.status === "pendente");
  const reviewing = orders.filter((o) => o.status === "aguardando");

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Pagamentos"
        description="Histórico de cobranças PIX."
        actions={
          <Button
            variant="secondary"
            icon={<Download className="size-4" />}
            disabled={orders.length === 0}
            onClick={() => exportOrders(orders, (id) => plans.find((p) => p.id === id)?.name ?? id)}
          >
            Exportar CSV
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total pago"
          value={paid.reduce((s, o) => s + o.amount_cents, 0) / 100}
          format={formatBRLCompact}
          icon={CircleCheck}
          tone="green"
          hint={`${paid.length} ${paid.length === 1 ? "cobrança" : "cobranças"}`}
        />
        <StatCard label="Aguardando PIX" value={pending.length} icon={Timer} tone="orange" hint="pague para liberar" />
        <StatCard label="Em conferência" value={reviewing.length} icon={Hourglass} tone="blue" hint="confirmação manual" />
      </div>
      <div className="mt-6">
        <MyOrdersTable title="Cobranças" orders={orders} plans={plans} />
      </div>
    </>
  );
}
