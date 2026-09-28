"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/errors";
import { friendlyError, isKnownError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { fail, runRpc } from "@/lib/supabase/rpc";
import type { AppRole, Audience, License, NotificationRow, Order, Profile, ProfileStatus, RevenuePoint, RevenueRange } from "@/lib/supabase/types";
import { couponCodeSchema, couponSchema, fullNameSchema, notificationSchema, planIdSchema, uuidSchema } from "@/lib/validation";

const invalid = () => fail("Dados inválidos.");

function done<T>(res: ActionResult<T>): ActionResult<T> {
  if (res.ok) revalidatePath("/admin", "layout");
  return res;
}

// Pedidos ---------------------------------------------------------------

export async function confirmOrder(orderId: string): Promise<ActionResult<Order>> {
  if (!uuidSchema.safeParse(orderId).success) return invalid();
  return done(await runRpc<Order>("confirm_order", { p_order_id: orderId }));
}

export async function rejectOrder(orderId: string, reason: string): Promise<ActionResult<Order>> {
  if (!uuidSchema.safeParse(orderId).success) return invalid();
  return done(await runRpc<Order>("reject_order", { p_order_id: orderId, p_reason: reason.slice(0, 300) }));
}

export async function refundOrder(orderId: string): Promise<ActionResult<Order>> {
  if (!uuidSchema.safeParse(orderId).success) return invalid();
  return done(await runRpc<Order>("refund_order", { p_order_id: orderId }));
}

// Licenças --------------------------------------------------------------

const issueSchema = z.object({
  userId: uuidSchema,
  planId: planIdSchema,
  days: z.number().int().min(1).max(3650),
  quantity: z.number().int().min(1).max(50),
});

export async function issueLicense(input: z.input<typeof issueSchema>): Promise<ActionResult<License[]>> {
  const parsed = issueSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const { userId, planId, days, quantity } = parsed.data;
  return done(await runRpc<License[]>("issue_license", { p_user_id: userId, p_plan_id: planId, p_days: days, p_quantity: quantity }));
}

export async function extendLicense(licenseId: string, days: number): Promise<ActionResult<License>> {
  if (!uuidSchema.safeParse(licenseId).success || !Number.isInteger(days)) return invalid();
  return done(await runRpc<License>("extend_license", { p_license_id: licenseId, p_days: days }));
}

export async function adminRevokeLicense(licenseId: string): Promise<ActionResult<License>> {
  if (!uuidSchema.safeParse(licenseId).success) return invalid();
  return done(await runRpc<License>("revoke_license", { p_license_id: licenseId }));
}

// Clientes --------------------------------------------------------------

export async function setCustomerStatus(userId: string, status: ProfileStatus): Promise<ActionResult<Profile>> {
  if (!uuidSchema.safeParse(userId).success || !["ativo", "suspenso"].includes(status)) return invalid();
  return done(await runRpc<Profile>("set_customer_status", { p_user_id: userId, p_status: status }));
}

export async function updateCustomer(userId: string, fullName: string, role: AppRole): Promise<ActionResult<Profile>> {
  const name = fullNameSchema.safeParse(fullName);
  if (!uuidSchema.safeParse(userId).success || !name.success || !["client", "admin", "reseller"].includes(role)) {
    return fail(name.success ? "Dados inválidos." : (name.error.issues[0]?.message ?? "Nome inválido."));
  }
  return done(await runRpc<Profile>("admin_update_profile", { p_user_id: userId, p_full_name: name.data, p_role: role }));
}

export async function deleteCustomer(userId: string): Promise<ActionResult<null>> {
  if (!uuidSchema.safeParse(userId).success) return invalid();
  return done(await runRpc<null>("delete_customer", { p_user_id: userId }));
}

// Cupons ----------------------------------------------------------------

export async function saveCoupon(input: z.input<typeof couponSchema>, isNew: boolean): Promise<ActionResult<null>> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const c = parsed.data;
  const row = {
    code: c.code,
    percent_off: c.kind === "percent" ? Math.round(c.value) : null,
    amount_off_cents: c.kind === "amount" ? Math.round(c.value * 100) : null,
    max_uses: c.maxUses,
    expires_at: new Date(`${c.expiresAt}T23:59:59-03:00`).toISOString(),
  };

  const supabase = await createClient();
  const { error } = isNew
    ? await supabase.from("coupons").insert(row)
    : await supabase.from("coupons").update(row).eq("code", c.code);
  if (error) {
    if (!isKnownError(error)) console.error("[saveCoupon]", error);
    return fail(friendlyError(error));
  }
  return done({ ok: true, data: null });
}

export async function setCouponActive(code: string, active: boolean): Promise<ActionResult<null>> {
  const parsed = couponCodeSchema.safeParse(code);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").update({ active }).eq("code", parsed.data);
  if (error) {
    console.error("[setCouponActive]", error);
    return fail(friendlyError(error));
  }
  return done({ ok: true, data: null });
}

export async function deleteCoupon(code: string): Promise<ActionResult<null>> {
  const parsed = couponCodeSchema.safeParse(code);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").delete().eq("code", parsed.data);
  if (error) {
    console.error("[deleteCoupon]", error);
    return fail(friendlyError(error));
  }
  return done({ ok: true, data: null });
}

// Notificações ----------------------------------------------------------

function audienceDetail(audience: Audience, userIds: string[], planId?: string): Record<string, unknown> {
  if (audience === "especificos") return { user_ids: userIds };
  if (audience === "plano") return { plan_id: planId };
  return {};
}

export async function sendNotification(input: z.input<typeof notificationSchema>): Promise<ActionResult<NotificationRow>> {
  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const n = parsed.data;
  return done(
    await runRpc<NotificationRow>("send_notification", {
      p_title: n.title,
      p_message: n.message,
      p_type: n.type,
      p_audience: n.audience,
      p_detail: audienceDetail(n.audience, n.userIds, n.planId),
      p_pinned: n.pinned,
    }),
  );
}

export async function notificationReach(audience: Audience, userIds: string[], planId?: string): Promise<ActionResult<number>> {
  const parsed = notificationSchema.pick({ audience: true, userIds: true, planId: true }).safeParse({ audience, userIds, planId });
  if (!parsed.success) return invalid();
  return runRpc<number>("notification_reach", {
    p_audience: parsed.data.audience,
    p_detail: audienceDetail(parsed.data.audience, parsed.data.userIds, parsed.data.planId),
  });
}

export async function deleteNotification(id: string): Promise<ActionResult<null>> {
  if (!uuidSchema.safeParse(id).success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) {
    console.error("[deleteNotification]", error);
    return fail(friendlyError(error));
  }
  return done({ ok: true, data: null });
}

// Relatórios ------------------------------------------------------------

export async function revenueSeries(range: RevenueRange): Promise<ActionResult<RevenuePoint[]>> {
  if (!["hoje", "7d", "30d", "ano"].includes(range)) return invalid();
  return runRpc<RevenuePoint[]>("revenue_series", { p_range: range });
}
