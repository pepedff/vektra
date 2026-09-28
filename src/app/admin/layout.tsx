import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { NotificationsProvider, type PanelNotification } from "@/features/notifications/provider";
import { toPanelUser } from "@/lib/auth/panel-user";
import { requireAdmin } from "@/lib/auth/session";
import { listNotifications } from "@/server/admin-queries";

export const metadata: Metadata = { title: "Painel administrativo — Vektra" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const sent: PanelNotification[] = (await listNotifications())
    .slice(0, 30)
    .map((n) => ({ id: n.id, title: n.title, message: n.message, type: n.type, pinned: n.pinned, created_at: n.created_at, seen: true, dismissed: false }));
  return (
    <NotificationsProvider variant="admin" initial={sent}>
      <DashboardShell variant="admin" user={toPanelUser(session)}>
        {children}
      </DashboardShell>
    </NotificationsProvider>
  );
}
