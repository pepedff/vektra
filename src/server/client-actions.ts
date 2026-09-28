"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { fail, runRpc } from "@/lib/supabase/rpc";
import type { License } from "@/lib/supabase/types";
import { emailSchema, profileSchema, uuidSchema } from "@/lib/validation";

export async function updateProfile(input: { fullName: string; phone?: string; pixKey?: string }): Promise<ActionResult<null>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null, pix_key: parsed.data.pixKey || null })
    .eq("id", auth.user.id);
  if (error) {
    console.error("[updateProfile]", error);
    return fail("Não foi possível salvar. Tente novamente.");
  }
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function revokeMyLicense(licenseId: string): Promise<ActionResult<License>> {
  if (!uuidSchema.safeParse(licenseId).success) return fail("Licença inválida.");
  const res = await runRpc<License>("revoke_license", { p_license_id: licenseId });
  if (res.ok) revalidatePath("/painel", "layout");
  return res;
}

export async function transferLicense(licenseId: string, email: string): Promise<ActionResult<License>> {
  const parsedEmail = emailSchema.safeParse(email);
  if (!uuidSchema.safeParse(licenseId).success || !parsedEmail.success) return fail("Informe um e-mail válido.");
  const res = await runRpc<License>("transfer_license", { p_license_id: licenseId, p_email: parsedEmail.data });
  if (res.ok) revalidatePath("/painel", "layout");
  return res;
}

export async function requestPayout(): Promise<ActionResult<null>> {
  return runRpc<null>("request_payout");
}

export async function markNotificationsSeen(ids: string[]): Promise<ActionResult<null>> {
  const valid = ids.filter((id) => uuidSchema.safeParse(id).success).slice(0, 100);
  if (valid.length === 0) return { ok: true, data: null };
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase
    .from("notification_reads")
    .upsert(
      valid.map((notification_id) => ({ user_id: auth.user.id, notification_id })),
      { onConflict: "user_id,notification_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[markNotificationsSeen]", error);
    return fail("Não foi possível atualizar as notificações.");
  }
  return { ok: true, data: null };
}

export async function dismissNotification(id: string): Promise<ActionResult<null>> {
  if (!uuidSchema.safeParse(id).success) return fail("Notificação inválida.");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail("Sua sessão expirou. Entre novamente.");

  const { error } = await supabase
    .from("notification_reads")
    .upsert({ user_id: auth.user.id, notification_id: id, dismissed_at: new Date().toISOString() }, { onConflict: "user_id,notification_id" });
  if (error) {
    console.error("[dismissNotification]", error);
    return fail("Não foi possível dispensar o aviso.");
  }
  return { ok: true, data: null };
}
