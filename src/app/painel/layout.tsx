import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { PinnedBanners } from "@/features/notifications/pinned-banners";
import { NotificationsProvider } from "@/features/notifications/provider";
import { toPanelUser } from "@/lib/auth/panel-user";
import { requireUser } from "@/lib/auth/session";
import { myNotifications } from "@/server/client-queries";

export const metadata: Metadata = { title: "Painel do cliente — Vektra" };

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const notifications = await myNotifications();
  return (
    <NotificationsProvider variant="client" initial={notifications}>
      <DashboardShell variant="client" user={toPanelUser(session)} banner={<PinnedBanners />}>
        {children}
      </DashboardShell>
    </NotificationsProvider>
  );
}
