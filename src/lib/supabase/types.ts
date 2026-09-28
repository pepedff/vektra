/** Espelha supabase/migrations/0001_init.sql. Mantenha em sincronia ao alterar o schema. */

export type AppRole = "client" | "admin" | "reseller";
export type ProfileStatus = "ativo" | "suspenso";
export type OrderStatus = "pendente" | "aguardando" | "pago" | "recusado" | "reembolsado" | "expirado";
export type LicenseStatus = "ativo" | "teste" | "revogada";
export type NotificationType = "info" | "success" | "warning" | "error";
export type Audience = "todos" | "especificos" | "plano" | "ativos" | "expirados";
export type LogLevel = "info" | "warn" | "error";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  pix_key: string | null;
  role: AppRole;
  status: ProfileStatus;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

export type Plan = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  credits: string;
  features: string[];
  max_licenses: number;
  duration_days: number;
  highlight: boolean;
  sort: number;
  active: boolean;
};

export type Coupon = {
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  max_uses: number;
  uses: number;
  expires_at: string;
  active: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  plan_id: string;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  amount_cents: number;
  coupon_code: string | null;
  status: OrderStatus;
  pix_txid: string;
  reject_reason: string | null;
  created_at: string;
  marked_paid_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
};

export type OrderWithCustomer = Order & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
};

export type License = {
  id: string;
  key: string;
  owner_id: string;
  reseller_id: string | null;
  order_id: string | null;
  plan_id: string;
  status: LicenseStatus;
  expires_at: string;
  reserved_email: string | null;
  created_at: string;
};

export type LicenseWithOwner = License & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
};

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  audience: Audience;
  audience_detail: { user_ids?: string[]; plan_id?: string };
  pinned: boolean;
  created_by: string | null;
  created_at: string;
};

export type NotificationRead = {
  user_id: string;
  notification_id: string;
  seen_at: string;
  dismissed_at: string | null;
};

export type AuditLog = {
  id: number;
  level: LogLevel;
  event: string;
  actor_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  profiles: Pick<Profile, "full_name" | "email"> | null;
};

export type LoginEvent = {
  id: number;
  user_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  profiles: Pick<Profile, "full_name" | "email"> | null;
};

export type AdminMetrics = {
  revenue_total_cents: number;
  revenue_today_cents: number;
  revenue_prev_30d_cents: number;
  revenue_30d_cents: number;
  customers: number;
  new_customers_30d: number;
  active_licenses: number;
  orders_30d: number;
  paid_orders_30d: number;
  awaiting_orders: number;
};

export type RevenueRange = "hoje" | "7d" | "30d" | "ano";
export type RevenuePoint = { bucket: string; value_cents: number };

export type TopPlan = { plan_id: string; name: string; orders: number; revenue_cents: number };

export type Partner = {
  id: string;
  full_name: string;
  email: string;
  referral_code: string;
  role: AppRole;
  referrals: number;
  sales: number;
  revenue_cents: number;
  commission_cents: number;
};

export type AffiliateSummary = {
  referral_code: string;
  referrals: number;
  paid_orders: number;
  commission_cents: number;
};

export type VersionStatus = "rascunho" | "publicada" | "arquivada";
export type RequestStatus = "pendente" | "aprovada" | "recusada";

export type Device = {
  id: string;
  user_id: string;
  license_id: string | null;
  fingerprint: string;
  name: string | null;
  user_agent: string | null;
  last_seen_at: string;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type ExtensionVersion = {
  id: string;
  version: string;
  name: string;
  changelog: string;
  status: VersionStatus;
  mandatory: boolean;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type DownloadEvent = {
  id: number;
  user_id: string;
  version_id: string;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
  extension_versions?: Pick<ExtensionVersion, "version" | "name"> | null;
};

export type ExtensionSettings = { id: "global"; branding: Record<string, unknown>; ai: Record<string, unknown>; updated_at: string };

export type ResellerPermissions = {
  user_id: string;
  create_customers: boolean;
  create_licenses: boolean;
  renew_licenses: boolean;
  suspend_licenses: boolean;
  view_sales: boolean;
  own_brand: boolean;
  customize: boolean;
  create_coupons: boolean;
  branding_fields: string[];
  created_at: string;
};

export type ResellerRequest = {
  id: string;
  user_id: string;
  message: string;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type Referral = {
  id: string;
  full_name: string;
  created_at: string;
  plan_id: string | null;
  commission_cents: number;
  has_paid: boolean;
};
