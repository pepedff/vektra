import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AI, mergeAi, type AiConfig } from "@/lib/extension/ai";
import { DEFAULT_BRANDING, mergeBranding, type Branding } from "@/lib/extension/branding";
import type {
  AffiliateSummary,
  Device,
  ExtensionSettings,
  ExtensionVersion,
  License,
  LoginEvent,
  Order,
  Plan,
  Referral,
  ResellerPermissions,
  ResellerRequest,
} from "@/lib/supabase/types";
import type { PanelNotification } from "@/features/notifications/provider";

type QueryResult<T> = { data: T | null; error: { message: string } | null };

function unwrap<T>(label: string, res: QueryResult<T>): T {
  if (res.error) throw new Error(`[${label}] ${res.error.message}`);
  return res.data as T;
}

export async function activePlans(): Promise<Plan[]> {
  const supabase = await createClient();
  return unwrap("plans", await supabase.from("plans").select("*").eq("active", true).order("sort"));
}

export async function myLicenses(): Promise<License[]> {
  const session = await requireUser();
  const supabase = await createClient();
  return unwrap(
    "licenses",
    await supabase.from("licenses").select("*").eq("owner_id", session.id).order("created_at", { ascending: false }),
  );
}

export async function myOrders(): Promise<Order[]> {
  const session = await requireUser();
  const supabase = await createClient();
  return unwrap(
    "orders",
    await supabase.from("orders").select("*").eq("user_id", session.id).order("created_at", { ascending: false }).limit(200),
  );
}

export async function myLogins(): Promise<LoginEvent[]> {
  const session = await requireUser();
  const supabase = await createClient();
  return unwrap(
    "login_events",
    await supabase.from("login_events").select("*, profiles(full_name, email)").eq("user_id", session.id).order("created_at", { ascending: false }).limit(20),
  );
}

export type AffiliateData = { summary: AffiliateSummary; referrals: Referral[] };

export async function myAffiliate(): Promise<AffiliateData> {
  await requireUser();
  const supabase = await createClient();
  const [summary, referrals] = await Promise.all([supabase.rpc("my_affiliate_summary"), supabase.rpc("my_referrals")]);
  return { summary: unwrap("my_affiliate_summary", summary), referrals: unwrap("my_referrals", referrals) };
}

export type ResaleStock = { available: License[]; transferred: License[] };

/** Licenças compradas como revendedor: em estoque (ainda minhas) e já repassadas. */
export async function myResaleStock(): Promise<ResaleStock> {
  const session = await requireUser();
  const supabase = await createClient();
  const rows = unwrap<License[]>(
    "resale",
    await supabase.from("licenses").select("*").eq("reseller_id", session.id).order("created_at", { ascending: false }).limit(1000),
  );
  return {
    available: rows.filter((l) => l.owner_id === session.id),
    transferred: rows.filter((l) => l.owner_id !== session.id),
  };
}

export async function myNotifications(): Promise<PanelNotification[]> {
  await requireUser();
  const supabase = await createClient();
  return unwrap("my_notifications", await supabase.rpc("my_notifications", { p_limit: 30 }));
}

export async function myDevices(): Promise<Device[]> {
  const session = await requireUser();
  const supabase = await createClient();
  return unwrap("devices", await supabase.from("devices").select("*").eq("user_id", session.id).order("last_seen_at", { ascending: false }));
}

export async function publishedVersions(): Promise<ExtensionVersion[]> {
  await requireUser();
  const supabase = await createClient();
  return unwrap(
    "versions",
    await supabase.from("extension_versions").select("*").neq("status", "rascunho").order("created_at", { ascending: false }),
  );
}

export async function latestPublished(): Promise<ExtensionVersion | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("latest_published_version");
  if (error) throw new Error(`[latest_published] ${error.message}`);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return (rows[0] as ExtensionVersion | undefined) ?? null;
}

export async function myResellerRequest(): Promise<ResellerRequest | null> {
  const session = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reseller_requests")
    .select("*")
    .eq("user_id", session.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[reseller_request] ${error.message}`);
  return data;
}

export async function myPermissions(): Promise<ResellerPermissions | null> {
  const session = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("reseller_permissions").select("*").eq("user_id", session.id).maybeSingle();
  if (error) throw new Error(`[permissions] ${error.message}`);
  return data;
}

export async function myResellerBranding(): Promise<Partial<Branding>> {
  const session = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("reseller_branding").select("branding").eq("reseller_id", session.id).maybeSingle();
  if (error) throw new Error(`[reseller_branding] ${error.message}`);
  return (data?.branding as Partial<Branding>) ?? {};
}

export async function effectiveAppearance(): Promise<{ branding: Branding; ai: AiConfig }> {
  const session = await requireUser();
  const supabase = await createClient();
  const settings = unwrap<ExtensionSettings>("settings", await supabase.from("extension_settings").select("*").eq("id", "global").single());
  const global = {
    branding: mergeBranding(DEFAULT_BRANDING, settings.branding as Partial<Branding>),
    ai: mergeAi(DEFAULT_AI, settings.ai as Partial<AiConfig>),
  };

  const license = unwrap<License[]>(
    "lic",
    await supabase.from("licenses").select("*").eq("owner_id", session.id).order("created_at", { ascending: false }).limit(5),
  ).find((l) => l.reseller_id);
  if (!license?.reseller_id) return global;

  const { data: override } = await supabase.from("reseller_branding").select("branding").eq("reseller_id", license.reseller_id).maybeSingle();
  if (!override) return global;
  return { branding: mergeBranding(global.branding, override.branding as Partial<Branding>), ai: global.ai };
}
