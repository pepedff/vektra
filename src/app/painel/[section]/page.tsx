import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { PaymentsView } from "@/features/client/payments-view";
import { PurchasesView } from "@/features/client/purchases-view";
import { LicensesView } from "@/features/client/licenses-view";
import { SettingsView } from "@/features/client/settings-view";
import { DevicesView, DownloadView, UpdatesView } from "@/features/extension/client-views";
import {
  ResellerClientsView,
  ResellerConfigView,
  ResellerDashboard,
  ResellerLicensesClientView,
  ResellerSalesView,
} from "@/features/resale/client-views";
import { effectiveStatus } from "@/lib/billing/license";
import { requireReseller, requireUser } from "@/lib/auth/session";
import {
  activePlans,
  latestPublished,
  myDevices,
  myLicenses,
  myLogins,
  myOrders,
  myPermissions,
  myResaleStock,
  myResellerBranding,
  myResellerRequest,
  publishedVersions,
} from "@/server/client-queries";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

const SECTIONS: Record<string, (search: Search) => Promise<ReactElement>> = {
  download: async () => {
    const [licenses, latest] = await Promise.all([myLicenses(), latestPublished()]);
    const licensed = licenses.some((l) => ["ativo", "teste"].includes(effectiveStatus(l)));
    return <DownloadView licensed={licensed} latest={latest} />;
  },
  licenca: async () => {
    const [licenses, plans] = await Promise.all([myLicenses(), activePlans()]);
    return <LicensesView licenses={licenses} plans={plans} />;
  },
  atualizacoes: async () => <UpdatesView versions={await publishedVersions()} />,
  dispositivos: async () => <DevicesView devices={await myDevices()} />,
  compras: async (search) => {
    const [plans, orders, licenses] = await Promise.all([activePlans(), myOrders(), myLicenses()]);
    const current = licenses.find((l) => effectiveStatus(l) === "ativo");
    const plano = typeof search.plano === "string" ? search.plano : undefined;
    return <PurchasesView plans={plans} orders={orders} currentPlanId={current?.plan_id ?? null} initialPlanId={plano} />;
  },
  pagamentos: async () => {
    const [orders, plans] = await Promise.all([myOrders(), activePlans()]);
    return <PaymentsView orders={orders} plans={plans} />;
  },
  configuracoes: async () => {
    const [session, logins, request] = await Promise.all([requireUser(), myLogins(), myResellerRequest()]);
    return <SettingsView variant="client" profile={session.profile} email={session.email} logins={logins} resellerRequest={request} />;
  },
  revenda: async () => {
    await requireReseller();
    const stock = await myResaleStock();
    return <ResellerDashboard available={stock.available} transferred={stock.transferred} />;
  },
  "revenda-clientes": async () => {
    await requireReseller();
    const stock = await myResaleStock();
    return <ResellerClientsView transferred={stock.transferred} />;
  },
  "revenda-licencas": async () => {
    const [perms, plans, stock] = await Promise.all([requireReseller().then(() => myPermissions()), activePlans(), myResaleStock()]);
    return <ResellerLicensesClientView available={stock.available} plans={plans} canCreate={Boolean(perms?.create_licenses)} />;
  },
  "revenda-vendas": async () => {
    await requireReseller();
    return <ResellerSalesView plans={await activePlans()} />;
  },
  "revenda-config": async () => {
    const [perms, branding] = await Promise.all([requireReseller().then(() => myPermissions()), myResellerBranding()]);
    if (!perms) notFound();
    return <ResellerConfigView permissions={perms} branding={branding} />;
  },
};

export default async function ClientSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Search>;
}) {
  const [{ section }, search] = await Promise.all([params, searchParams]);
  const load = Object.hasOwn(SECTIONS, section) ? SECTIONS[section] : undefined;
  if (!load) notFound();
  return load(search);
}
