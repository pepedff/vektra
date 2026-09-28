import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminMetrics,
  AppRole,
  AuditLog,
  Coupon,
  License,
  LicenseWithOwner,
  LoginEvent,
  NotificationRow,
  OrderWithCustomer,
  Device,
  DownloadEvent,
  ExtensionSettings,
  ExtensionVersion,
  Partner,
  Plan,
  ResellerPermissions,
  ResellerRequest,
  Profile,
  ProfileStatus,
  RevenuePoint,
  TopPlan,
} from "@/lib/supabase/types";

type QueryResult<T> = { data: T | null; error: { message: string } | null };

function unwrap<T>(label: string, res: QueryResult<T>): T {
  if (res.error) throw new Error(`[${label}] ${res.error.message}`);
  return res.data as T;
}

export type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  status: ProfileStatus;
  created_at: string;
  plan_id: string | null;
  active_licenses: number;
  spent_cents: number;
};

const ORDER_SELECT = "*, profiles:profiles!orders_user_id_fkey(full_name, email)";
const LICENSE_SELECT = "*, profiles:profiles!licenses_owner_id_fkey(full_name, email)";

export async function listPlans(): Promise<Plan[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("plans", await supabase.from("plans").select("*").order("sort"));
}

export async function listOrders(): Promise<OrderWithCustomer[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("orders", await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(1000));
}

export async function listCoupons(): Promise<Coupon[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("coupons", await supabase.from("coupons").select("*").order("created_at", { ascending: false }));
}

export async function listLicenses(): Promise<LicenseWithOwner[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("licenses", await supabase.from("licenses").select(LICENSE_SELECT).order("created_at", { ascending: false }).limit(2000));
}

export async function listCustomers(): Promise<CustomerRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const [profiles, licenses, orders] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase.from("licenses").select("owner_id, plan_id, status, expires_at, created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("user_id, amount_cents").eq("status", "pago"),
  ]);
  const people = unwrap<Profile[]>("profiles", profiles);
  const lic = unwrap<Pick<License, "owner_id" | "plan_id" | "status" | "expires_at">[]>("licenses", licenses);
  const paid = unwrap<{ user_id: string; amount_cents: number }[]>("orders", orders);

  const now = Date.now();
  return people.map((p) => {
    const active = lic.filter((l) => l.owner_id === p.id && l.status !== "revogada" && new Date(l.expires_at).getTime() > now);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      status: p.status,
      created_at: p.created_at,
      plan_id: active[0]?.plan_id ?? null,
      active_licenses: active.length,
      spent_cents: paid.filter((o) => o.user_id === p.id).reduce((sum, o) => sum + o.amount_cents, 0),
    };
  });
}

export async function listLoginEvents(): Promise<LoginEvent[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap(
    "login_events",
    await supabase.from("login_events").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(500),
  );
}

export async function listAuditLogs(): Promise<AuditLog[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap(
    "audit_logs",
    await supabase.from("audit_logs").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(500),
  );
}

export async function listNotifications(): Promise<NotificationRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("notifications", await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100));
}

export async function listPartners(kind: "afiliados" | "revendedores"): Promise<Partner[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("admin_partners", await supabase.rpc("admin_partners", { p_kind: kind }));
}

export type DashboardData = {
  metrics: AdminMetrics;
  series: RevenuePoint[];
  topPlans: TopPlan[];
  recentOrders: OrderWithCustomer[];
  recentLogs: AuditLog[];
};

export async function getMetrics(): Promise<AdminMetrics> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("admin_metrics", await supabase.rpc("admin_metrics"));
}

export async function getRevenueSeries(range: "hoje" | "7d" | "30d" | "ano"): Promise<RevenuePoint[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("revenue_series", await supabase.rpc("revenue_series", { p_range: range }));
}

export async function listDevices(): Promise<Device[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("devices", await supabase.from("devices").select("*, profiles(full_name, email)").order("last_seen_at", { ascending: false }).limit(1000));
}

export async function listVersions(): Promise<ExtensionVersion[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("versions", await supabase.from("extension_versions").select("*").order("created_at", { ascending: false }));
}

export async function listDownloads(): Promise<DownloadEvent[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap(
    "downloads",
    await supabase.from("download_events").select("*, profiles(full_name, email), extension_versions(version, name)").order("created_at", { ascending: false }).limit(500),
  );
}

export async function listResellerRequests(): Promise<ResellerRequest[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap(
    "requests",
    await supabase
      .from("reseller_requests")
      .select("*, profiles:profiles!reseller_requests_user_id_fkey(full_name, email)")
      .order("created_at", { ascending: false }),
  );
}

export async function listResellerPermissions(): Promise<ResellerPermissions[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("perms", await supabase.from("reseller_permissions").select("*"));
}

export async function getExtensionSettings(): Promise<ExtensionSettings> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap("settings", await supabase.from("extension_settings").select("*").eq("id", "global").single());
}

export async function listResellerLicenses(): Promise<LicenseWithOwner[]> {
  await requireAdmin();
  const supabase = await createClient();
  return unwrap(
    "reseller_licenses",
    await supabase.from("licenses").select(LICENSE_SELECT).not("reseller_id", "is", null).order("created_at", { ascending: false }).limit(2000),
  );
}

export async function getDashboard(): Promise<DashboardData> {
  await requireAdmin();
  const supabase = await createClient();
  const [metrics, series, topPlans, recentOrders, recentLogs] = await Promise.all([
    supabase.rpc("admin_metrics"),
    supabase.rpc("revenue_series", { p_range: "30d" }),
    supabase.rpc("top_plans"),
    supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(6),
    supabase.from("audit_logs").select("*, profiles(full_name, email)").order("created_at", { ascending: false }).limit(6),
  ]);
  return {
    metrics: unwrap("admin_metrics", metrics),
    series: unwrap("revenue_series", series),
    topPlans: unwrap("top_plans", topPlans),
    recentOrders: unwrap("recent_orders", recentOrders),
    recentLogs: unwrap("recent_logs", recentLogs),
  };
}
