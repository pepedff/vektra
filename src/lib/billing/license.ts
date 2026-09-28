import type { License } from "@/lib/supabase/types";

export type EffectiveLicenseStatus = "ativo" | "teste" | "expirado" | "revogada";

export function effectiveStatus(license: Pick<License, "status" | "expires_at">, now: Date = new Date()): EffectiveLicenseStatus {
  if (license.status === "revogada") return "revogada";
  if (new Date(license.expires_at).getTime() <= now.getTime()) return "expirado";
  return license.status;
}
