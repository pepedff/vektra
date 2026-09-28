import { AdminDashboardView } from "@/features/admin/dashboard-view";
import { getDashboard } from "@/server/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  return <AdminDashboardView data={await getDashboard()} />;
}
