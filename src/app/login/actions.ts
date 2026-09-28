"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/errors";
import { safeNext } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { emailSchema, passwordSchema, signInSchema, signUpSchema } from "@/lib/validation";

type Redirect = { redirectTo: string };

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function recordLogin(): Promise<void> {
  const h = await headers();
  const supabase = await createClient();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const { error } = await supabase.rpc("record_login", { p_user_agent: h.get("user-agent"), p_ip: ip });
  if (error) console.error("[record_login]", error);
}

export async function signIn(input: { email: string; password: string; next?: string }): Promise<ActionResult<Redirect>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Digite e-mail e senha válidos." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { ok: false, error: "Confirme seu e-mail antes de entrar." };
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single<Pick<Profile, "role" | "status">>();
  if (profileError) {
    console.error("[signIn] perfil", profileError);
    return { ok: false, error: "Não foi possível carregar sua conta. Tente novamente." };
  }
  if (profile.status === "suspenso") {
    await supabase.auth.signOut();
    return { ok: false, error: "Sua conta está suspensa. Fale com o suporte." };
  }

  await recordLogin();
  const home = profile.role === "admin" ? "/admin" : "/painel";
  const next = safeNext(input.next, home);
  return { ok: true, data: { redirectTo: next.startsWith("/admin") && profile.role !== "admin" ? "/painel" : next } };
}

export async function signUp(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<ActionResult<Redirect | { confirmEmail: true }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise seus dados." };

  const ref = (await cookies()).get("vk_ref")?.value;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, ...(ref ? { ref } : {}) },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/painel`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { ok: false, error: "Já existe uma conta com esse e-mail." };
    if (error.code === "weak_password") return { ok: false, error: "Escolha uma senha mais forte." };
    console.error("[signUp]", error);
    return { ok: false, error: "Não foi possível criar a conta. Tente novamente." };
  }

  if (!data.session) return { ok: true, data: { confirmEmail: true } };
  await recordLogin();
  return { ok: true, data: { redirectTo: "/painel" } };
}

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Digite um e-mail válido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/redefinir-senha`,
  });
  // Resposta idêntica exista ou não a conta, para não revelar e-mails cadastrados.
  if (error) console.error("[resetPassword]", error);
  return { ok: true, data: null };
}

export async function updatePassword(password: string): Promise<ActionResult<Redirect>> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Senha inválida." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Use uma senha diferente da atual." };
    console.error("[updatePassword]", error);
    return { ok: false, error: "Link expirado. Peça um novo e-mail de recuperação." };
  }
  return { ok: true, data: { redirectTo: "/painel" } };
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[signOut]", error);
  redirect("/login");
}
