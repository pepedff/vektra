"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Order, Plan } from "@/lib/supabase/types";
import { CheckoutModal, type CheckoutTarget } from "./checkout-modal";
import { formatCents as cents } from "@/lib/format";
import { MyOrdersTable } from "./order-history";

export function PurchasesView({
  plans,
  orders,
  currentPlanId,
  initialPlanId,
}: {
  plans: Plan[];
  orders: Order[];
  currentPlanId: string | null;
  initialPlanId?: string;
}) {
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);

  useEffect(() => {
    const plan = plans.find((p) => p.id === initialPlanId);
    if (plan) setCheckout({ plan, quantity: 1 });
  }, [initialPlanId, plans]);

  const close = () => {
    setCheckout(null);
    if (initialPlanId) router.replace("/painel/compras", { scroll: false });
  };

  return (
    <>
      <PageHeader icon={ShoppingBag} title="Compras" description="Planos, upgrades e novas licenças. Pagamento via PIX." />

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const current = plan.id === currentPlanId;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-panel p-6",
                plan.highlight ? "ring-gradient bg-[#131a26]" : "border border-line bg-card",
              )}
            >
              {plan.highlight && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(70%_100%_at_50%_0%,rgb(0_168_255/0.12),transparent)]" />
              )}
              <div className="relative flex items-center justify-between">
                <p className="text-[16px] font-semibold">{plan.name}</p>
                {current ? (
                  <span className="rounded-full bg-green/12 px-2.5 py-1 text-[11px] font-semibold text-green ring-1 ring-green/25">Seu plano atual</span>
                ) : (
                  plan.highlight && (
                    <span className="rounded-full bg-blue/12 px-2.5 py-1 text-[11px] font-semibold text-cyan ring-1 ring-blue/25">Mais escolhido</span>
                  )
                )}
              </div>
              <p className="relative mt-3 text-[30px] font-bold tracking-tight tabular">
                {cents(plan.price_cents)}
                <span className="text-[13px] font-normal text-muted"> /{plan.duration_days} dias</span>
              </p>
              <p className="relative mt-1 text-[13px] text-muted">{plan.credits}</p>
              <ul className="relative mt-5 flex-1 space-y-2.5">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13.5px] text-fg/85">
                    <Check className="size-4 text-green" strokeWidth={2.6} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlight || current ? "action" : "secondary"}
                className="relative mt-6 w-full"
                trailingIcon={<ArrowRight className="size-4" />}
                onClick={() => setCheckout({ plan, quantity: 1 })}
              >
                {current ? "Comprar licença extra" : `Assinar ${plan.name}`}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6">
        <MyOrdersTable title="Histórico de compras" orders={orders.slice(0, 20)} plans={plans} pageSize={5} withFilters={false} />
      </div>

      <CheckoutModal target={checkout} onClose={close} />
    </>
  );
}
