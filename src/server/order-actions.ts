"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { fail, runRpc } from "@/lib/supabase/rpc";
import type { CouponQuote } from "@/lib/billing/pricing";
import type { Order } from "@/lib/supabase/types";
import { couponCodeSchema, createOrderSchema, uuidSchema } from "@/lib/validation";
import { pixForOrder, type PixCharge } from "./pix";

export type OrderCharge = { order: Order; pix: PixCharge };

async function withPix(order: Order): Promise<ActionResult<OrderCharge>> {
  try {
    return { ok: true, data: { order, pix: await pixForOrder(order) } };
  } catch (error) {
    console.error("[pix]", error);
    return fail("Pagamento por PIX indisponível no momento. Fale com o suporte.");
  }
}

export async function checkCoupon(code: string): Promise<ActionResult<CouponQuote | null>> {
  const parsed = couponCodeSchema.safeParse(code);
  if (!parsed.success) return { ok: true, data: null };
  const res = await runRpc<{ percent_off: number | null; amount_off_cents: number | null }[]>("check_coupon", {
    p_code: parsed.data,
  });
  if (!res.ok) return res;
  const row = res.data[0];
  return { ok: true, data: row ? { percentOff: row.percent_off, amountOffCents: row.amount_off_cents } : null };
}

export async function createOrder(input: { planId: string; quantity?: number; coupon?: string }): Promise<ActionResult<OrderCharge>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return fail("Dados do pedido inválidos.");

  const res = await runRpc<Order>("create_order", {
    p_plan_id: parsed.data.planId,
    p_quantity: parsed.data.quantity,
    p_coupon: parsed.data.coupon || null,
  });
  if (!res.ok) return res;
  revalidatePath("/painel", "layout");
  return withPix(res.data);
}

/** Reabre a cobrança de um pedido pendente do próprio usuário. */
export async function getOrderCharge(orderId: string): Promise<ActionResult<OrderCharge>> {
  if (!uuidSchema.safeParse(orderId).success) return fail("Pedido inválido.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle<Order>();
  if (error) {
    console.error("[getOrderCharge]", error);
    return fail("Não foi possível carregar o pedido.");
  }
  if (!data || data.status !== "pendente") return fail("Este pedido não está mais aguardando pagamento.");
  return withPix(data);
}

export async function markOrderPaid(orderId: string): Promise<ActionResult<Order>> {
  if (!uuidSchema.safeParse(orderId).success) return fail("Pedido inválido.");
  const res = await runRpc<Order>("mark_order_paid", { p_order_id: orderId });
  if (res.ok) revalidatePath("/painel", "layout");
  return res;
}
