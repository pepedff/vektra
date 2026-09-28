import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export type SessionUser = { id: string; email: string; profile: Profile };

/** Valida o usuário no servidor de Auth (não confia só no cookie) e carrega o perfil. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single<Profile>();
  if (profileError) throw new Error(`Falha ao carregar perfil: ${profileError.message}`);

  return { id: data.user.id, email: data.user.email ?? profile.email, profile };
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.status === "suspenso") redirect("/login?erro=suspenso");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.profile.role !== "admin") redirect("/painel");
  return session;
}

export async function requireReseller(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.profile.role !== "reseller") redirect("/painel");
  return session;
}