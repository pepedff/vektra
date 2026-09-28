import type { PanelUser } from "@/components/dashboard/sidebar";
import type { SessionUser } from "./session";

const ROLE_LABEL = { admin: "Administrador", reseller: "Revendedor", client: "Cliente" } as const;

export function toPanelUser(session: SessionUser): PanelUser {
  return {
    name: session.profile.full_name,
    email: session.email,
    roleLabel: ROLE_LABEL[session.profile.role],
    isAdmin: session.profile.role === "admin",
    isReseller: session.profile.role === "reseller",
  };
}
