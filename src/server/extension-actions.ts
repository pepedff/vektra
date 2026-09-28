"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { brandingSchema, aiSchema, reservedLicenseSchema, resellerMessageSchema, versionSchema } from "@/lib/validation";
import type { Branding } from "@/lib/extension/branding";
import type { AiConfig } from "@/lib/extension/ai";
import type { ExtensionSettings, ExtensionVersion, License, ResellerPermissions, ResellerRequest } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import { fail, runRpc } from "@/lib/supabase/rpc";

function done<T>(res: ActionResult<T>, path: "/admin" | "/painel"): ActionResult<T> {
  if (res.ok) revalidatePath(path, "layout");
  return res;
}

export async function requestReseller(message: string): Promise<ActionResult<ResellerRequest>> {
  const parsed = resellerMessageSchema.safeParse(message);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Mensagem inválida.");
  return done(await runRpc<ResellerRequest>("request_reseller", { p_message: parsed.data }), "/painel");
}

export async function reviewResellerRequest(id: string, approve: boolean, perms: Partial<ResellerPermissions>): Promise<ActionResult<ResellerRequest>> {
  return done(
    await runRpc<ResellerRequest>("review_reseller_request", {
      p_id: id,
      p_approve: approve,
      p_perms: {
        create_customers: perms.create_customers,
        create_licenses: perms.create_licenses,
        renew_licenses: perms.renew_licenses,
        suspend_licenses: perms.suspend_licenses,
        view_sales: perms.view_sales,
        own_brand: perms.own_brand,
        customize: perms.customize,
        create_coupons: perms.create_coupons,
        branding_fields: perms.branding_fields ?? [],
      },
    }),
    "/admin",
  );
}

export async function setResellerPermissions(userId: string, perms: Partial<ResellerPermissions>): Promise<ActionResult<ResellerPermissions>> {
  return done(await runRpc<ResellerPermissions>("set_reseller_permissions", { p_user_id: userId, p_perms: perms }), "/admin");
}

export async function createReservedLicense(input: { email: string; planId: string; days: number }): Promise<ActionResult<License>> {
  const parsed = reservedLicenseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  return done(
    await runRpc<License>("create_reserved_license", { p_email: parsed.data.email, p_plan_id: parsed.data.planId, p_days: parsed.data.days }),
    "/painel",
  );
}

export async function saveVersion(input: { id?: string; version: string; name: string; changelog: string; mandatory: boolean; storagePath?: string; fileName?: string }): Promise<ActionResult<ExtensionVersion>> {
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  return done(
    await runRpc<ExtensionVersion>("save_extension_version", {
      p_id: parsed.data.id ?? null,
      p_version: parsed.data.version,
      p_name: parsed.data.name,
      p_changelog: parsed.data.changelog,
      p_mandatory: parsed.data.mandatory,
      p_storage_path: input.storagePath ?? "",
      p_file_name: input.fileName ?? "",
    }),
    "/admin",
  );
}

export async function publishVersion(id: string): Promise<ActionResult<ExtensionVersion>> {
  return done(await runRpc<ExtensionVersion>("publish_extension_version", { p_id: id }), "/admin");
}

export async function saveGlobalSettings(branding: Branding, ai: AiConfig): Promise<ActionResult<ExtensionSettings>> {
  const b = brandingSchema.safeParse({ ...branding, logoUrl: branding.logoUrl || null, iconUrl: branding.iconUrl || null });
  const a = aiSchema.safeParse(ai);
  if (!b.success) return fail(b.error.issues[0]?.message ?? "Personalização inválida.");
  if (!a.success) return fail(a.error.issues[0]?.message ?? "Configuração da IA inválida.");
  return done(await runRpc<ExtensionSettings>("save_extension_settings", { p_branding: b.data, p_ai: a.data }), "/admin");
}

export async function saveMyBranding(branding: Partial<Branding>): Promise<ActionResult<unknown>> {
  return done(await runRpc("save_reseller_branding", { p_branding: branding }), "/painel");
}

export type DownloadLink = { version: string; fileName: string; url: string };

export async function requestDownload(): Promise<ActionResult<DownloadLink>> {
  const res = await runRpc<ExtensionVersion>("request_extension_download");
  if (!res.ok) return res;
  if (!res.data.storage_path) return fail("A extensão está indisponível no momento. Tente de novo em breve.");

  const supabase = await createClient();
  const signed = await supabase.storage.from("extension-releases").createSignedUrl(res.data.storage_path, 60);
  if (signed.error || !signed.data?.signedUrl) {
    console.error("[requestDownload]", signed.error);
    return fail("A extensão está indisponível no momento. Tente de novo em breve.");
  }
  revalidatePath("/admin", "layout");
  return { ok: true, data: { version: res.data.version, fileName: res.data.file_name ?? `extensao-v${res.data.version}.zip`, url: signed.data.signedUrl } };
}
