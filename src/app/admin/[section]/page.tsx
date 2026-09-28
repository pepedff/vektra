import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import type { CustomerOption } from "@/features/admin/add-license-modal";
import { CustomersView } from "@/features/admin/customers-view";
import { NotificationsView } from "@/features/admin/notifications-view";
import { AdminDevicesView, AdminLicensesView } from "@/features/admin/people-views";
import { AdminPaymentsView, CouponsView, OrdersView } from "@/features/admin/sales-views";
import { LogsView } from "@/features/admin/system-views";
import { SettingsView } from "@/features/client/settings-view";
import { AdminExtensionOverview } from "@/features/extension/admin-overview";
import { AiView } from "@/features/extension/ai-view";
import { BrandingView } from "@/features/extension/branding-view";
import { DownloadsView, VersionsView } from "@/features/extension/versions-view";
import { ResellerLicensesView, ResellersAdminView, RequestsView } from "@/features/resale/admin-views";
import { DEFAULT_AI, type AiConfig } from "@/lib/extension/ai";
import { DEFAULT_BRANDING, type Branding } from "@/lib/extension/branding";
import { requireAdmin } from "@/lib/auth/session";
import {
  getExtensionSettings,
  listAuditLogs,
  listCoupons,
  listCustomers,
  listDevices,
  listDownloads,
  listLicenses,
  listNotifications,
  listOrders,
  listPartners,
  listPlans,
  listResellerLicenses,
  listResellerPermissions,
  listResellerRequests,
  listVersions,
} from "@/server/admin-queries";
import { myLogins } from "@/server/client-queries";
import { storeStatus } from "@/server/pix";

export const dynamic = "force-dynamic";

async function customerOptions(): Promise<CustomerOption[]> {
  return (await listCustomers()).map((c) => ({ id: c.id, name: c.full_name, email: c.email, plan_id: c.plan_id }));
}

async function ordersAndPlans() {
  return Promise.all([listOrders(), listPlans()]);
}

async function appearance() {
  const settings = await getExtensionSettings();
  return {
    branding: { ...DEFAULT_BRANDING, ...(settings.branding as Partial<Branding>) },
    ai: { ...DEFAULT_AI, ...(settings.ai as Partial<AiConfig>) },
  };
}

const SECTIONS: Record<string, () => Promise<ReactElement>> = {
  usuarios: async () => {
    const [session, customers, plans] = await Promise.all([requireAdmin(), listCustomers(), listPlans()]);
    return <CustomersView customers={customers} plans={plans} currentUserId={session.id} />;
  },
  clientes: async () => SECTIONS.usuarios(),
  licencas: async () => {
    const [licenses, customers, plans] = await Promise.all([listLicenses(), customerOptions(), listPlans()]);
    return <AdminLicensesView licenses={licenses} customers={customers} plans={plans} />;
  },
  dispositivos: async () => <AdminDevicesView devices={await listDevices()} />,
  pedidos: async () => {
    const [orders, plans] = await ordersAndPlans();
    return <OrdersView orders={orders} plans={plans} />;
  },
  pagamentos: async () => {
    const [orders, plans] = await ordersAndPlans();
    return <AdminPaymentsView orders={orders} plans={plans} />;
  },
  cupons: async () => <CouponsView coupons={await listCoupons()} />,
  revendedores: async () => {
    const [partners, permissions] = await Promise.all([listPartners("revendedores"), listResellerPermissions()]);
    return <ResellersAdminView partners={partners} permissions={permissions} />;
  },
  solicitacoes: async () => <RequestsView requests={await listResellerRequests()} />,
  "licencas-revenda": async () => {
    const [licenses, plans] = await Promise.all([listResellerLicenses(), listPlans()]);
    return <ResellerLicensesView licenses={licenses} plans={plans} />;
  },
  extensao: async () => {
    const [versions, downloads, look] = await Promise.all([listVersions(), listDownloads(), appearance()]);
    return (
      <AdminExtensionOverview
        latest={versions.find((v) => v.status === "publicada") ?? null}
        downloads={downloads.length}
        branding={look.branding}
        ai={look.ai}
      />
    );
  },
  versoes: async () => <VersionsView versions={await listVersions()} mode="versoes" />,
  arquivos: async () => <VersionsView versions={await listVersions()} mode="arquivos" />,
  downloads: async () => <DownloadsView events={await listDownloads()} />,
  personalizacao: async () => {
    const look = await appearance();
    return <BrandingView tab="personalizacao" branding={look.branding} ai={look.ai} />;
  },
  interface: async () => {
    const look = await appearance();
    return <BrandingView tab="interface" branding={look.branding} ai={look.ai} />;
  },
  comportamento: async () => {
    const look = await appearance();
    return <BrandingView tab="comportamento" branding={look.branding} ai={look.ai} />;
  },
  ia: async () => {
    const look = await appearance();
    return <AiView tab="ia" branding={look.branding} ai={look.ai} />;
  },
  prompts: async () => {
    const look = await appearance();
    return <AiView tab="prompts" branding={look.branding} ai={look.ai} />;
  },
  modelos: async () => {
    const look = await appearance();
    return <AiView tab="modelos" branding={look.branding} ai={look.ai} />;
  },
  atualizacoes: async () => <VersionsView versions={await listVersions()} mode="atualizacoes" />,
  notificacoes: async () => {
    const [notifications, customers, plans] = await Promise.all([listNotifications(), customerOptions(), listPlans()]);
    return <NotificationsView notifications={notifications} customers={customers} plans={plans} />;
  },
  configuracoes: async () => {
    const [session, logins] = await Promise.all([requireAdmin(), myLogins()]);
    return <SettingsView variant="admin" profile={session.profile} email={session.email} logins={logins} store={storeStatus()} />;
  },
  logs: async () => <LogsView logs={await listAuditLogs()} />,
};

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const load = Object.hasOwn(SECTIONS, section) ? SECTIONS[section] : undefined;
  if (!load) notFound();
  return load();
}
